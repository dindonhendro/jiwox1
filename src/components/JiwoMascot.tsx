import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { gsap } from 'gsap';

type MascotState = 'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep';

// The real Jiwo renders (fluffy blue friend with yellow glasses), one per
// emotion. Stress has no dedicated render — Jiwo stays in his steady idle
// pose while the floating-hearts overlay does the comforting.
const MASCOT_SRCS: Record<MascotState, string> = {
  idle: '/jiwo/idle.png',
  happy: '/jiwo/happy.png',
  calm: '/jiwo/calm.png',
  stress: '/jiwo/stress.png',
  sad: '/jiwo/sad.png',
  sleep: '/jiwo/sleep.png',
};

interface JiwoMascotProps {
  state?: MascotState;
  scale?: number;
  showAnimation?: boolean;
}

// Per-emotion effects layered around the single artwork: a colour tint on the
// body, an aura glow behind it, floating particles above it, and how slowly
// Jiwo breathes. Particles do the emotional storytelling the static PNG can't.
const STATE_FX: Record<
  MascotState,
  { filter: string; aura: string; particles: string[]; spawnMs: number; bobSec: number }
> = {
  idle: {
    filter: 'none',
    aura: 'rgba(210, 236, 238, 0.55)',
    particles: ['✨'],
    spawnMs: 3200,
    bobSec: 2.6,
  },
  happy: {
    filter: 'saturate(1.25) brightness(1.06)',
    aura: 'rgba(244, 211, 94, 0.35)',
    particles: ['✨', '🎉', '⭐', '💛'],
    spawnMs: 550,
    bobSec: 1.5,
  },
  calm: {
    filter: 'saturate(0.95)',
    aura: 'rgba(143, 188, 143, 0.35)',
    particles: ['🍃', '✨'],
    spawnMs: 2400,
    bobSec: 3.6,
  },
  stress: {
    // Jiwo stays warm and steady when the user is anxious — hearts, not alarm.
    filter: 'none',
    aura: 'rgba(232, 142, 141, 0.22)',
    particles: ['💚', '🤍'],
    spawnMs: 1300,
    bobSec: 2.2,
  },
  sad: {
    filter: 'saturate(0.82) brightness(0.98)',
    aura: 'rgba(107, 144, 179, 0.28)',
    particles: ['💙'],
    spawnMs: 1900,
    bobSec: 3.2,
  },
  sleep: {
    filter: 'saturate(0.72) brightness(0.9)',
    aura: 'rgba(179, 157, 219, 0.3)',
    particles: ['💤'],
    spawnMs: 1700,
    bobSec: 4.6,
  },
};

// SVG face fallback if the artwork ever fails to load
const FALLBACK_FACES: Record<MascotState, { gradient: string; face: ReactNode }> = {
  idle: {
    gradient: 'from-jiwo-primaryLight to-jiwo-primary',
    face: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="35" cy="45" r="5" fill="#2C3E3F" />
        <circle cx="65" cy="45" r="5" fill="#2C3E3F" />
        <path d="M 42 58 Q 50 64 58 58" stroke="#2C3E3F" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  happy: {
    gradient: 'from-[#FFF275] to-[#F4D35E]',
    face: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 30 46 Q 35 40 40 46" stroke="#2C3E3F" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M 60 46 Q 65 40 70 46" stroke="#2C3E3F" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M 40 56 Q 50 72 60 56 Z" fill="#2C3E3F" />
      </svg>
    ),
  },
  calm: {
    gradient: 'from-jiwo-sageLight to-jiwo-sage',
    face: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 30 48 Q 35 52 40 48" stroke="#2C3E3F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 60 48 Q 65 52 70 48" stroke="#2C3E3F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 44 56 Q 50 60 56 56" stroke="#2C3E3F" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  stress: {
    gradient: 'from-[#FBC7C7] to-jiwo-stress',
    face: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 32 48 Q 36 43 40 48" stroke="#2C3E3F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 60 48 Q 64 43 68 48" stroke="#2C3E3F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="62" r="5" fill="#2C3E3F" />
      </svg>
    ),
  },
  sad: {
    gradient: 'from-jiwo-blueLight to-jiwo-blueCalm',
    face: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 30 46 L 38 50" stroke="#2C3E3F" strokeWidth="4" strokeLinecap="round" />
        <path d="M 70 46 L 62 50" stroke="#2C3E3F" strokeWidth="4" strokeLinecap="round" />
        <path d="M 42 62 Q 50 54 58 62" stroke="#2C3E3F" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="32" cy="56" rx="2.5" ry="4" fill="#64B5F6" />
      </svg>
    ),
  },
  sleep: {
    gradient: 'from-[#E1BEE7] to-[#8E24AA]',
    face: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 30 48 Q 35 51 40 48" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 60 48 Q 65 51 70 48" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 45 58 Q 50 61 55 58" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
};

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function JiwoMascot({
  state = 'idle',
  scale = 1,
  showAnimation = true,
}: JiwoMascotProps) {
  const [imgError, setImgError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const particleLayerRef = useRef<HTMLDivElement>(null);

  const fx = STATE_FX[state] || STATE_FX.idle;
  const fallback = FALLBACK_FACES[state] || FALLBACK_FACES.idle;

  // Each state has its own image now — retry on state change
  useEffect(() => {
    setImgError(false);
  }, [state]);

  // Spawn one floating particle that drifts up and fades out
  const spawnParticle = useCallback((emoji: string, burst = false) => {
    const layer = particleLayerRef.current;
    if (!layer) return;
    const span = document.createElement('span');
    span.textContent = emoji;
    span.setAttribute('aria-hidden', 'true');
    span.style.cssText =
      'position:absolute;left:50%;top:55%;font-size:18px;pointer-events:none;will-change:transform,opacity;';
    layer.appendChild(span);

    const spreadX = burst ? gsap.utils.random(-70, 70) : gsap.utils.random(-55, 55);
    gsap.fromTo(
      span,
      { x: spreadX * 0.4, y: 0, scale: 0.4, opacity: 0, rotation: gsap.utils.random(-25, 25) },
      {
        x: spreadX,
        y: gsap.utils.random(-90, -130),
        scale: gsap.utils.random(0.8, 1.25),
        opacity: 1,
        duration: burst ? 0.9 : 2.2,
        ease: burst ? 'power2.out' : 'sine.out',
        onComplete: () => {
          gsap.to(span, {
            opacity: 0,
            y: '-=25',
            duration: 0.6,
            ease: 'sine.in',
            onComplete: () => span.remove(),
          });
        },
      }
    );
  }, []);

  // Continuous mood particles while a state is active
  useEffect(() => {
    if (!showAnimation || prefersReducedMotion()) return;
    if (state === 'idle') return; // idle stays serene — no confetti noise

    const interval = setInterval(() => {
      spawnParticle(fx.particles[Math.floor(Math.random() * fx.particles.length)]);
    }, fx.spawnMs);
    return () => clearInterval(interval);
  }, [state, showAnimation, fx, spawnParticle]);

  // GSAP breathing loop (speed follows the emotion) + 3D pointer tilt
  useEffect(() => {
    const body = bodyRef.current;
    const wrapper = wrapperRef.current;
    if (!body || !wrapper || !showAnimation || prefersReducedMotion()) return;

    const breathe = gsap.to(body, {
      y: -9,
      duration: fx.bobSec,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });

    const tiltX = gsap.quickTo(body, 'rotationY', { duration: 0.6, ease: 'power2.out' });
    const tiltY = gsap.quickTo(body, 'rotationX', { duration: 0.6, ease: 'power2.out' });

    const onMove = (e: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      tiltX(gsap.utils.clamp(-14, 14, dx * 22));
      tiltY(gsap.utils.clamp(-10, 10, -dy * 16));
    };
    const onLeave = () => {
      tiltX(0);
      tiltY(0);
    };
    wrapper.addEventListener('pointermove', onMove);
    wrapper.addEventListener('pointerleave', onLeave);

    return () => {
      breathe.kill();
      wrapper.removeEventListener('pointermove', onMove);
      wrapper.removeEventListener('pointerleave', onLeave);
      gsap.set(body, { rotationX: 0, rotationY: 0, y: 0 });
    };
  }, [state, showAnimation, fx.bobSec]);

  // Elastic squash-and-stretch pop whenever the mood state changes
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !showAnimation || prefersReducedMotion()) return;

    const pop = gsap.fromTo(
      body,
      { scale: 0.82, rotation: state === 'happy' ? -6 : 0 },
      { scale: 1, rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }
    );
    return () => {
      pop.kill();
    };
  }, [state, showAnimation]);

  // Tap Jiwo: happy wiggle + a little sparkle burst — pure delight
  const handleTap = () => {
    const body = bodyRef.current;
    if (!body || prefersReducedMotion()) return;

    gsap.timeline()
      .to(body, { rotation: -8, scale: 1.08, duration: 0.12, ease: 'power2.out' })
      .to(body, { rotation: 8, duration: 0.14, ease: 'power1.inOut' })
      .to(body, { rotation: -5, duration: 0.12, ease: 'power1.inOut' })
      .to(body, { rotation: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });

    const burst = ['✨', '💛', '⭐', '✨', '💙', '✨'];
    burst.forEach((emoji, i) => setTimeout(() => spawnParticle(emoji, true), i * 40));
  };

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handleTap}
      className="relative flex items-center justify-center select-none animate-fade-in cursor-pointer"
      style={{
        width: '180px',
        height: '180px',
        transform: `scale(${scale})`,
        transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        perspective: '600px'
      }}
    >
      {/* Emotion aura glow behind the body */}
      <div
        className="absolute inset-3 rounded-full blur-2xl transition-colors duration-1000"
        style={{ background: fx.aura }}
      />

      {/* Decorative pulse ring for breathing states */}
      {showAnimation && (state === 'calm' || state === 'idle') && (
        <div
          className="absolute inset-0 rounded-full bg-jiwo-primaryLight/30 animate-ping"
          style={{ animationDuration: '4s' }}
        />
      )}

      {/* GSAP-animated body: breathes, tilts in 3D toward the pointer, and pops on mood change */}
      <div
        ref={bodyRef}
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      >
        {!imgError ? (
          <img
            src={MASCOT_SRCS[state] || MASCOT_SRCS.idle}
            alt={`Jiwo - ${state}`}
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-[filter] duration-1000"
            style={{ filter: fx.filter }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={`absolute inset-2 rounded-full bg-gradient-to-tr ${fallback.gradient} border-2 border-white/50 shadow-lg flex items-center justify-center overflow-hidden`}
          >
            <div className="w-24 h-24 relative">{fallback.face}</div>
          </div>
        )}
      </div>

      {/* Floating mood particles (confetti, hearts, leaves, Zzz) */}
      <div ref={particleLayerRef} className="absolute inset-0 z-20 pointer-events-none overflow-visible" />
    </div>
  );
}
