import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { MOOD_PALETTES, onSceneMood } from '@/lib/sceneMood';

interface CalmSceneProps {
  /** Extra classes for the fixed wrapper (e.g. opacity tweaks per page). */
  className?: string;
}

const AURORA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Slow-flowing fbm "aurora" in the brand palette, painted over the cream
// background. Values are tuned low so UI text on top always stays readable.
const AURORA_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec3 uBg;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 drift = uPointer * 0.06;
    float t = uTime * 0.035;

    float n1 = fbm(uv * 1.6 + vec2(t, -t * 0.6) + drift);
    float n2 = fbm(uv * 2.2 + vec2(-t * 0.8, t * 0.5) - drift + 4.7);
    float n3 = fbm(uv * 1.1 + vec2(t * 0.4, t * 0.9) + 9.3);

    vec3 col = uBg;
    col = mix(col, uColorA, smoothstep(0.45, 0.9, n1) * 0.30);
    col = mix(col, uColorB, smoothstep(0.5, 0.95, n2) * 0.24);
    col = mix(col, uColorC, smoothstep(0.55, 1.0, n3) * 0.18);

    // Gentle vignette keeps focus in the centre of the screen.
    float d = distance(uv, vec2(0.5, 0.45));
    col = mix(col, uBg, smoothstep(0.35, 0.95, d) * 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const PARTICLE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aOffset;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    // Slow upward drift with a sine sway, wrapping vertically.
    pos.y = mod(pos.y + uTime * aSpeed, 12.0) - 6.0;
    pos.x += sin(uTime * 0.25 + aOffset) * 0.5;
    pos.x += uPointer.x * 0.35 * pos.z;
    pos.y += uPointer.y * 0.2 * pos.z;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (140.0 / -mv.z);

    // Fade near the top/bottom wrap so particles never pop.
    vAlpha = smoothstep(6.0, 4.5, abs(pos.y)) * 0.35;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Fullscreen ambient WebGL background: a slow aurora shader + drifting light
 * particles with pointer parallax. Renders a single static frame when the
 * user prefers reduced motion, and pauses when the tab is hidden.
 */
export default function CalmScene({ className = '' }: CalmSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      50
    );
    camera.position.z = 8;

    const palette = MOOD_PALETTES.idle;
    const auroraUniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uBg: { value: new THREE.Color('#F9FBF9') },
      uColorA: { value: new THREE.Color(palette.a) },
      uColorB: { value: new THREE.Color(palette.b) },
      uColorC: { value: new THREE.Color(palette.c) },
    };

    const aurora = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: auroraUniforms,
        vertexShader: AURORA_VERTEX,
        fragmentShader: AURORA_FRAGMENT,
        depthWrite: false,
        depthTest: false,
      })
    );
    aurora.frustumCulled = false;
    aurora.renderOrder = -1;
    scene.add(aurora);

    // Floating light motes
    const COUNT = 130;
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    const offsets = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      sizes[i] = 0.5 + Math.random() * 1.1;
      speeds[i] = 0.08 + Math.random() * 0.18;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    particleGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    particleGeo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    const particleUniforms = {
      uTime: { value: 0 },
      uPointer: { value: auroraUniforms.uPointer.value },
      uColor: { value: new THREE.Color(palette.a) },
    };
    const particles = new THREE.Points(
      particleGeo,
      new THREE.ShaderMaterial({
        uniforms: particleUniforms,
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
    );
    scene.add(particles);

    // Pointer parallax, smoothed with GSAP quickTo-style lerping.
    const targetPointer = new THREE.Vector2(0, 0);
    const onPointerMove = (e: PointerEvent) => {
      targetPointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1)
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Mood-reactive palette: tween shader colours when a mood is logged.
    const offMood = onSceneMood((mood) => {
      const p = MOOD_PALETTES[mood] ?? MOOD_PALETTES.idle;
      const dur = reducedMotion ? 0 : 2.4;
      gsap.to(auroraUniforms.uColorA.value, { ...hexToRgb(p.a), duration: dur, ease: 'sine.inOut' });
      gsap.to(auroraUniforms.uColorB.value, { ...hexToRgb(p.b), duration: dur, ease: 'sine.inOut' });
      gsap.to(auroraUniforms.uColorC.value, { ...hexToRgb(p.c), duration: dur, ease: 'sine.inOut' });
      gsap.to(particleUniforms.uColor.value, { ...hexToRgb(p.a), duration: dur, ease: 'sine.inOut' });
    });

    const startTime = performance.now();
    let raf = 0;
    let running = true;

    const renderFrame = () => {
      const t = (performance.now() - startTime) / 1000;
      auroraUniforms.uTime.value = t;
      particleUniforms.uTime.value = t;
      auroraUniforms.uPointer.value.lerp(targetPointer, 0.04);
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      renderFrame();
      raf = requestAnimationFrame(loop);
    };

    if (reducedMotion) {
      renderFrame(); // static, but still beautiful
    } else {
      loop();
    }

    const onVisibility = () => {
      running = document.visibilityState === 'visible' && !reducedMotion;
      if (running) {
        loop();
      } else {
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (reducedMotion) renderFrame();
    };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      offMood();
      aurora.geometry.dispose();
      (aurora.material as THREE.Material).dispose();
      particleGeo.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`fixed inset-0 z-0 pointer-events-none ${className}`}
    />
  );
}

function hexToRgb(hex: string) {
  const c = new THREE.Color(hex);
  return { r: c.r, g: c.g, b: c.b };
}
