import { Sparkles, ArrowRight } from 'lucide-react';

interface QuotaBubbleProps {
  message: string;
  onUpgrade: () => void;
}

/**
 * Pattern #1 — a soft in-chat bubble shown when the daily chat quota is used up.
 * Warm, non-intrusive, stays in the conversation flow.
 */
export default function QuotaBubble({ message, onUpgrade }: QuotaBubbleProps) {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full overflow-hidden bg-jiwo-sageLight border border-jiwo-sage/25 flex items-center justify-center shrink-0">
        <img src="/jiwo/calm.png" alt="" draggable={false} className="w-full h-full object-contain" />
      </div>
      <div className="max-w-[82%] bg-jiwo-sageLight/70 border border-jiwo-sage/30 text-jiwo-textDark rounded-2xl rounded-bl-none p-3.5 text-sm leading-relaxed">
        {message}
        <button
          onClick={onUpgrade}
          className="mt-2.5 inline-flex items-center gap-1.5 text-jiwo-primary font-bold text-xs bg-white/70 hover:bg-white px-3 py-1.5 rounded-full transition"
        >
          <Sparkles className="w-3.5 h-3.5" /> Coba Premium
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
