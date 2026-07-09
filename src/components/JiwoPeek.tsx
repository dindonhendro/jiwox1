import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const MASCOT_SRC = '/jiwo/happy.png';

const PEEK_MESSAGES = [
  'Hai! Jiwo cuma mau bilang: kamu hebat hari ini 💙',
  'Jangan lupa minum air putih ya! 💧',
  'Tarik napas dalam... hembuskan... Nah, lebih lega kan? 🍃',
  'Kamu sudah sampai sejauh ini. Itu luar biasa! ✨',
  'Jiwo selalu di sini kalau kamu butuh teman 🤗',
  'Istirahat sebentar itu bukan malas, tapi sayang diri 🌱',
  'Satu langkah kecil hari ini tetap sebuah kemajuan 🐾',
];

/**
 * Jiwo occasionally peeks from the bottom corner of the app — a small moment
 * of delight. Tapping the peeking Jiwo pops an encouraging message bubble.
 * Decorative only: skipped entirely under prefers-reduced-motion.
 */
export default function JiwoPeek() {
  const peekRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPeek = useRef(true);

  // Each time Jiwo hides, schedule the next peek: ~18s for the first,
  // then a random 50–90s in between.
  useEffect(() => {
    if (visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const delay = firstPeek.current ? 18000 : gsap.utils.random(50000, 90000);
    firstPeek.current = false;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => {
      clearTimeout(timer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible]);

  // Animate in/out whenever visibility flips
  useEffect(() => {
    const el = peekRef.current;
    if (!el) return;

    if (visible) {
      // Slide up from the corner at a curious angle, wiggle, then retreat
      const tl = gsap.timeline({
        onComplete: () => {
          setVisible(false);
          setMessage(null);
        },
      });
      tl.fromTo(
        el,
        { y: 130, rotation: 18, opacity: 1 },
        { y: 38, rotation: -6, duration: 0.8, ease: 'back.out(1.6)' }
      )
        .to(el, { rotation: 4, duration: 0.5, ease: 'sine.inOut' })
        .to(el, { rotation: -4, duration: 0.5, ease: 'sine.inOut' })
        .to(el, { rotation: 0, duration: 0.4, ease: 'sine.inOut' })
        .to(el, { y: 130, rotation: 14, duration: 0.6, ease: 'power2.in', delay: 3 });

      return () => {
        tl.kill();
      };
    }
  }, [visible]);

  const handleTap = () => {
    const el = peekRef.current;
    if (!el) return;
    // Pause the retreat, celebrate, show a message
    gsap.killTweensOf(el);
    gsap.timeline()
      .to(el, { y: 20, rotation: 0, scale: 1.1, duration: 0.3, ease: 'back.out(2)' })
      .to(el, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });

    setMessage(PEEK_MESSAGES[Math.floor(Math.random() * PEEK_MESSAGES.length)]);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const node = peekRef.current;
      if (node) {
        gsap.to(node, {
          y: 130,
          rotation: 14,
          duration: 0.6,
          ease: 'power2.in',
          onComplete: () => {
            setVisible(false);
            setMessage(null);
          },
        });
      }
    }, 4200);
  };

  if (!visible) return null;

  return (
    <div className="absolute bottom-16 left-3 z-30 pointer-events-none">
      {message && (
        <div className="absolute -top-16 left-8 w-52 bg-white rounded-2xl rounded-bl-sm shadow-lg border border-jiwo-primaryLight/40 px-3.5 py-2.5 text-2xs font-semibold text-jiwo-textDark animate-fade-in pointer-events-none">
          {message}
        </div>
      )}
      <button
        ref={peekRef}
        onClick={handleTap}
        aria-label="Sapa Jiwo"
        className="pointer-events-auto w-20 h-20 focus:outline-none"
        style={{ transform: 'translateY(130px)' }}
      >
        <img src={MASCOT_SRC} alt="" draggable={false} className="w-full h-full object-contain drop-shadow-md" />
      </button>
    </div>
  );
}
