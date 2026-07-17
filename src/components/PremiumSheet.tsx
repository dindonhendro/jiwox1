import { useEffect, useState } from 'react';
import { X, Star, Check, MessageCircle, BookOpen, LineChart, Compass, Loader2 } from 'lucide-react';
import { PRICE_MONTHLY, PRICE_EARLYBIRD } from '@/lib/limits';
import { startIpay88Checkout } from '@/lib/ipay88';

interface PremiumSheetProps {
  open: boolean;
  onClose: () => void;
}

const BENEFITS = [
  { icon: MessageCircle, text: 'Ngobrol dengan Jiwo tanpa batas' },
  { icon: BookOpen, text: 'Jurnal & riwayat penuh + ekspor' },
  { icon: LineChart, text: 'Peta hati 30 & 90 hari' },
  { icon: Compass, text: 'Semua sesi terpandu terbuka' },
];

/**
 * Upgrade-to-Premium sheet (pattern #2). Shared target for the quota bubble and
 * locked cards. Payment is a placeholder for now — no billing wired yet.
 */
export default function PremiumSheet({ open, onClose }: PremiumSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset transient state whenever the sheet is reopened.
  useEffect(() => {
    if (open) {
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      // Early-bird monthly QRIS via iPay88. Redirects the browser on success.
      await startIpay88Checkout('earlybird');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi ya.');
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 shadow-2xl border-t border-jiwo-primaryLight/30"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.2,1,0.3,1)' }}
      >
        <span className="block w-10 h-1 rounded-full bg-jiwo-primaryLight/70 mx-auto mb-4" aria-hidden="true" />

        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 p-1.5 rounded-full text-jiwo-textMuted hover:bg-jiwo-bg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-10 h-10 rounded-2xl bg-jiwo-happy/20 text-jiwo-happy flex items-center justify-center">
            <Star className="w-5 h-5 fill-current" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-jiwo-textDark leading-tight">Buka Jiwo Premium</h2>
            <p className="text-2xs text-jiwo-textMuted">Temani hatimu tanpa batas 💙</p>
          </div>
        </div>

        <div className="my-5 space-y-2.5">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.text} className="flex items-center gap-3 text-sm text-jiwo-textDark">
                <span className="w-6 h-6 rounded-full bg-jiwo-sageLight flex items-center justify-center text-jiwo-sage shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <Icon className="w-4 h-4 text-jiwo-primary shrink-0" />
                <span>{b.text}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-end justify-center gap-2 mb-4">
          <span className="text-3xl font-extrabold text-jiwo-textDark">{PRICE_EARLYBIRD}</span>
          <span className="text-sm text-jiwo-textMuted line-through mb-1">{PRICE_MONTHLY}</span>
          <span className="text-2xs text-jiwo-textMuted mb-1.5">/bulan</span>
        </div>
        <p className="text-3xs text-center text-jiwo-primary font-bold mb-4">✨ Harga early-bird untuk pengguna pertama</p>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-jiwo-primary to-jiwo-blueCalm text-white font-bold py-3.5 rounded-2xl shadow-md hover:shadow-lg transition disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengarahkan ke QRIS…
            </>
          ) : (
            'Bayar dengan QRIS'
          )}
        </button>
        {error && (
          <p className="text-3xs text-center text-red-500 mt-2 font-semibold">{error}</p>
        )}
        <p className="text-4xs text-center text-jiwo-textMuted mt-3">
          Pembayaran aman via iPay88 (QRIS). Fitur keselamatan (Rescue, Bantuan Krisis) selalu gratis untuk semua.
        </p>
      </div>
    </div>
  );
}
