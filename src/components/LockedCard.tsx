import type { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';

interface LockedCardProps {
  title: string;
  subtitle?: string;
  onUpgrade: () => void;
  /** Blurred preview shown behind the lock overlay */
  children?: ReactNode;
}

/**
 * Pattern #5 — a premium-gated feature card. Shows a blurred teaser of the
 * locked content with a lock + upgrade CTA. Very contextual: appears right at
 * the feature the user is trying to reach.
 */
export default function LockedCard({ title, subtitle, onUpgrade, children }: LockedCardProps) {
  return (
    <div className="relative rounded-3xl border border-jiwo-primaryLight/25 bg-white overflow-hidden">
      {children && (
        <div className="pointer-events-none blur-[3px] opacity-45 select-none" aria-hidden="true">
          {children}
        </div>
      )}

      <div
        className={`flex flex-col items-center justify-center gap-2.5 text-center p-6 bg-white/50 backdrop-blur-[1px] ${
          children ? 'absolute inset-0' : ''
        }`}
      >
        <span className="w-11 h-11 rounded-full bg-jiwo-happy/20 text-jiwo-happy flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-extrabold text-jiwo-textDark">{title}</p>
          {subtitle && <p className="text-2xs text-jiwo-textMuted max-w-[220px] mx-auto">{subtitle}</p>}
        </div>
        <button
          onClick={onUpgrade}
          className="mt-1 inline-flex items-center gap-1.5 bg-jiwo-primary hover:bg-jiwo-primary/95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5" /> Buka dengan Premium
        </button>
      </div>
    </div>
  );
}
