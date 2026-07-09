import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Animates every route change: the page lifts in with a soft fade, and any
 * element marked with `data-animate` staggers in after it. Skipped entirely
 * when the user prefers reduced motion.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 22, scale: 0.988 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out', clearProps: 'transform' }
      );

      const items = el.querySelectorAll('[data-animate]');
      if (items.length) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            delay: 0.1,
            ease: 'power3.out',
            clearProps: 'transform',
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [location.pathname]);

  return <div ref={ref}>{children}</div>;
}
