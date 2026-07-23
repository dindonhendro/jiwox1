import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import JiwoMascot from './JiwoMascot';

type Phase = 'inhale' | 'hold' | 'exhale';

// Must stay in sync with the Rescue breathing pacing (5-0-5)
const PHASE_SEC: Record<Phase, number> = { inhale: 5, hold: 0, exhale: 5 };

interface BreathingJiwoProps {
  phase: Phase;
}

/**
 * Jiwo breathes along with the user: his whole body swells over the full
 * 4s inhale, holds gently, and deflates through the 6s exhale. A guide ring
 * expands and contracts with him, and little air motes stream INTO him on
 * the inhale and OUT of him on the exhale — so the direction of each breath
 * is visible and fun to follow.
 */
export default function BreathingJiwo({ phase }: BreathingJiwoProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const airRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    const ring = ringRef.current;
    const glow = glowRef.current;
    const air = airRef.current;
    if (!body || !ring || !glow || !air) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const d = PHASE_SEC[phase];
    const tweens: gsap.core.Tween[] = [];

    if (phase === 'inhale') {
      // Chest fills: body swells and lifts, ring and glow expand with it
      tweens.push(gsap.to(body, { scale: 1.22, y: -10, duration: d, ease: 'sine.inOut' }));
      tweens.push(gsap.to(ring, { scale: 1.3, opacity: 0.9, duration: d, ease: 'sine.inOut' }));
      tweens.push(gsap.to(glow, { scale: 1.4, opacity: 0.75, duration: d, ease: 'sine.inOut' }));
    } else if (phase === 'hold') {
      // Suspended: everything stays full; the ring marker slowly orbits so
      // the moment still feels alive, not frozen
      tweens.push(gsap.to(body, { scale: 1.24, duration: d, ease: 'sine.inOut' }));
      tweens.push(gsap.to(ring, { rotation: '+=54', duration: d, ease: 'none' }));
    } else {
      // Long release: everything settles back down, slower than the inhale
      tweens.push(gsap.to(body, { scale: 1, y: 0, duration: d, ease: 'sine.inOut' }));
      tweens.push(gsap.to(ring, { scale: 1, opacity: 0.45, duration: d, ease: 'sine.inOut' }));
      tweens.push(gsap.to(glow, { scale: 1, opacity: 0.35, duration: d, ease: 'sine.inOut' }));
    }

    // Air motes: drawn inward on the inhale, released outward on the exhale
    let spawner: ReturnType<typeof setInterval> | null = null;
    if (phase !== 'hold') {
      spawner = setInterval(() => {
        const mote = document.createElement('span');
        const size = 4 + Math.random() * 5;
        mote.style.cssText = `position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;margin:-${size / 2}px 0 0 -${size / 2}px;border-radius:50%;background:rgba(79,163,165,0.5);pointer-events:none;will-change:transform,opacity;`;
        air.appendChild(mote);

        const ang = Math.random() * Math.PI * 2;
        const R = 125 + Math.random() * 45;
        const ox = Math.cos(ang) * R;
        const oy = Math.sin(ang) * R * 0.85;

        if (phase === 'inhale') {
          gsap.fromTo(
            mote,
            { x: ox, y: oy, opacity: 0, scale: 0.5 },
            {
              x: ox * 0.1,
              y: oy * 0.1,
              opacity: 0.85,
              scale: 1,
              duration: 1.3,
              ease: 'power1.in',
              onComplete: () => {
                gsap.to(mote, { opacity: 0, scale: 0.3, duration: 0.25, onComplete: () => mote.remove() });
              },
            }
          );
        } else {
          gsap.fromTo(
            mote,
            { x: ox * 0.1, y: oy * 0.1, opacity: 0.85, scale: 1 },
            {
              x: ox,
              y: oy,
              opacity: 0,
              scale: 0.4,
              duration: 1.7,
              ease: 'power1.out',
              onComplete: () => mote.remove(),
            }
          );
        }
      }, 170);
    }

    return () => {
      tweens.forEach((t) => t.kill());
      if (spawner) clearInterval(spawner);
    };
  }, [phase]);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: 270, height: 270 }}>
      {/* Soft glow that inflates with the breath */}
      <div
        ref={glowRef}
        className="absolute w-52 h-52 rounded-full bg-jiwo-primaryLight blur-2xl"
        style={{ opacity: 0.35, willChange: 'transform, opacity' }}
      />

      {/* Guide ring: expands on inhale, orbits during hold, settles on exhale */}
      <div
        ref={ringRef}
        className="absolute w-56 h-56 rounded-full border-2 border-jiwo-primary/40"
        style={{ opacity: 0.45, willChange: 'transform, opacity' }}
      >
        <span className="absolute -top-[5px] left-1/2 -ml-[5px] w-2.5 h-2.5 rounded-full bg-jiwo-primary shadow-sm shadow-jiwo-primary/50" />
      </div>

      {/* Air motes layer */}
      <div ref={airRef} className="absolute inset-0 pointer-events-none overflow-visible" />

      {/* Jiwo himself — all motion owned by this component */}
      <div ref={bodyRef} style={{ willChange: 'transform' }}>
        <JiwoMascot state="calm" scale={1} showAnimation={false} />
      </div>
    </div>
  );
}
