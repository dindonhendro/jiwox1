// iPay88 QRIS — Backend callback / webhook (PUBLIC, no JWT).
//
// iPay88 posts the FINAL, authoritative transaction status here server-to-server.
// This is the only place we trust to grant premium. We MUST:
//   1. Re-compute the signature from the fields iPay88 sent and compare.
//   2. Only on a valid signature + Status '1' flip the payment to success and
//      grant premium.
//   3. Reply with the literal text "RECEIVEOK" so iPay88 stops retrying.
//
// Deploy with verify_jwt = false (see supabase/config.toml) — iPay88 cannot send
// a Supabase JWT.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { ipay88Env, backendSignature } from '../_shared/ipay88.ts';

// iPay88 accepts either form-urlencoded (classic OPSG) or JSON (Core API). Parse
// whichever came in into a flat string map.
async function parseCallback(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const j = await req.json().catch(() => ({}));
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j ?? {})) out[k] = v == null ? '' : String(v);
    return out;
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');

  try {
    const p = await parseCallback(req);

    // Field names differ between classic OPSG and Core API — accept both.
    const merchantCode = p.MerchantCode ?? '';
    const paymentId    = p.PaymentId ?? p.PaymentID ?? '';
    const refNo        = p.RefNo ?? '';
    const amount       = p.Amount ?? '';
    const currency     = p.Currency ?? 'IDR';
    const status       = p.Status ?? p.TransactionStatus ?? '';
    const signature    = p.Signature ?? '';
    const transId      = p.TransId ?? '';
    const authCode     = p.AuthCode ?? '';
    const errDesc      = p.ErrDesc ?? '';

    const { merchantKey } = ipay88Env();

    // 1. Verify signature (recompute from the exact values iPay88 sent).
    const expected = await backendSignature(
      merchantKey, merchantCode, paymentId, refNo, amount, currency, status,
    );
    const signatureValid = !!signature && signature.toLowerCase() === expected.toLowerCase();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);

    if (!signatureValid) {
      console.error('iPay88 backend: signature mismatch', { refNo, status });
      await admin.from('ipay88_payments')
        .update({ raw: p, err_desc: 'signature_mismatch', updated_at: new Date().toISOString() })
        .eq('ref_no', refNo);
      // Still ack so iPay88 stops retrying a request we have logged.
      return new Response('RECEIVEOK', { headers: { 'Content-Type': 'text/plain' } });
    }

    // Find the pending payment we created at checkout.
    const { data: payment } = await admin
      .from('ipay88_payments')
      .select('id, user_id, plan, status')
      .eq('ref_no', refNo)
      .single();

    if (!payment) {
      console.error('iPay88 backend: unknown RefNo', refNo);
      return new Response('RECEIVEOK', { headers: { 'Content-Type': 'text/plain' } });
    }

    const isSuccess = status === '1';
    const newStatus = isSuccess ? 'success' : (status === '6' ? 'pending' : 'failed');

    await admin.from('ipay88_payments').update({
      status: newStatus,
      trans_id: transId,
      auth_code: authCode,
      err_desc: errDesc,
      raw: p,
      updated_at: new Date().toISOString(),
    }).eq('ref_no', refNo);

    // 2. Grant premium only on a genuinely successful, not-already-processed payment.
    if (isSuccess && payment.status !== 'success') {
      const { PLANS } = await import('../_shared/ipay88.ts');
      const days = PLANS[payment.plan]?.days ?? 30;

      // Extend from the later of "now" or an existing unexpired premium_until.
      const { data: prof } = await admin
        .from('profiles').select('premium_until').eq('id', payment.user_id).single();
      const now = Date.now();
      const existing = prof?.premium_until ? new Date(prof.premium_until).getTime() : 0;
      const base = existing > now ? existing : now;
      const until = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

      await admin.from('profiles')
        .update({ is_premium: true, premium_until: until })
        .eq('id', payment.user_id);
    }

    return new Response('RECEIVEOK', { headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    console.error('ipay88-backend error:', err);
    // Ack anyway — returning non-OK makes iPay88 retry indefinitely.
    return new Response('RECEIVEOK', { headers: { 'Content-Type': 'text/plain' } });
  }
});
