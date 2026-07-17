import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type View = 'success' | 'failed' | 'pending';

/**
 * Landing page for the iPay88 browser redirect (/result). The query params from
 * ipay88-response give an instant hint, but the authoritative status is the
 * payments row set by the backend webhook — so we briefly poll it to reflect the
 * real outcome (and confirm premium was granted).
 */
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const hinted = (searchParams.get('status') as View) || 'pending';
  const refNo = searchParams.get('refNo') || '';
  const amount = searchParams.get('amount') || '';
  const errDesc = searchParams.get('errDesc') || '';

  const [view, setView] = useState<View>(hinted);
  const [confirming, setConfirming] = useState<boolean>(hinted !== 'failed' && !!refNo);

  // Poll the payments row for the webhook's verdict (up to ~15s).
  useEffect(() => {
    if (!refNo || hinted === 'failed') {
      setConfirming(false);
      return;
    }
    let tries = 0;
    let active = true;

    const poll = async () => {
      const { data } = await supabase
        .from('ipay88_payments')
        .select('status')
        .eq('ref_no', refNo)
        .maybeSingle();

      if (!active) return;

      if (data?.status === 'success') {
        setView('success');
        setConfirming(false);
        return;
      }
      if (data?.status === 'failed') {
        setView('failed');
        setConfirming(false);
        return;
      }

      tries += 1;
      if (tries >= 8) {
        setConfirming(false); // give up waiting; keep the hinted view
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => { active = false; };
  }, [refNo, hinted]);

  const rupiah = amount ? `Rp ${Number(amount).toLocaleString('id-ID')}` : '';

  return (
    <div className="min-h-screen bg-jiwo-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-jiwo-primaryLight/20 p-8">
        {confirming ? (
          <>
            <Loader2 className="w-14 h-14 text-jiwo-primary mx-auto animate-spin" />
            <h1 className="text-lg font-extrabold text-jiwo-textDark mt-4">Mengonfirmasi pembayaran…</h1>
            <p className="text-sm text-jiwo-textMuted mt-1">Tunggu sebentar ya 💙</p>
          </>
        ) : view === 'success' ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-jiwo-sage mx-auto" />
            <h1 className="text-xl font-extrabold text-jiwo-textDark mt-4">Pembayaran Berhasil! 🎉</h1>
            <p className="text-sm text-jiwo-textMuted mt-1">
              Terima kasih 💙 Jiwo Premium kamu sudah aktif.
            </p>
          </>
        ) : view === 'pending' ? (
          <>
            <Clock className="w-16 h-16 text-jiwo-happy mx-auto" />
            <h1 className="text-xl font-extrabold text-jiwo-textDark mt-4">Menunggu Pembayaran</h1>
            <p className="text-sm text-jiwo-textMuted mt-1">
              Kalau kamu sudah membayar, statusnya akan diperbarui otomatis sebentar lagi.
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-jiwo-stress mx-auto" />
            <h1 className="text-xl font-extrabold text-jiwo-textDark mt-4">Pembayaran Gagal</h1>
            <p className="text-sm text-jiwo-textMuted mt-1">
              {errDesc || 'Pembayaran tidak selesai. Kamu bisa mencobanya lagi.'}
            </p>
          </>
        )}

        {(refNo || rupiah) && (
          <div className="mt-5 text-2xs text-jiwo-textMuted space-y-1 bg-jiwo-bg rounded-xl p-3">
            {refNo && <p>No. Referensi: <span className="font-semibold text-jiwo-textDark">{refNo}</span></p>}
            {rupiah && <p>Nominal: <span className="font-semibold text-jiwo-textDark">{rupiah}</span></p>}
          </div>
        )}

        <Link
          to="/"
          className="mt-6 inline-block w-full bg-gradient-to-r from-jiwo-primary to-jiwo-blueCalm text-white font-bold py-3 rounded-2xl shadow-md hover:shadow-lg transition"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
