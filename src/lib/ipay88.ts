// Frontend trigger for the iPay88 QRIS flow.
//
// This never touches the MerchantKey or computes a signature — it only asks our
// own edge function (which holds the secret) for a signed checkout payload, then
// auto-submits a POST form to iPay88's entry.asp so the QRIS page loads.
import { supabase } from '@/lib/supabaseClient';

export type PremiumPlan = 'earlybird' | 'monthly' | 'yearly';

/**
 * Starts a QRIS checkout for the given plan. On success the browser is
 * redirected to iPay88 (this function does not return in that case). Throws on
 * error so callers can surface a message.
 */
export async function startIpay88Checkout(plan: PremiumPlan = 'earlybird'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Kamu perlu masuk dulu untuk berlangganan.');
  }

  const { data, error } = await supabase.functions.invoke('ipay88-checkout', {
    body: { plan },
  });

  if (error) {
    throw new Error(error.message || 'Gagal memulai pembayaran.');
  }
  if (!data?.success || !data?.checkout_url || !data?.payload) {
    throw new Error(data?.error || 'Respons pembayaran tidak valid.');
  }

  // Build a hidden form and submit it — this navigates the browser to iPay88.
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.checkout_url;

  Object.entries(data.payload as Record<string, string>).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value ?? '';
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
