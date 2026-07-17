// iPay88 QRIS — Checkout initiator (AUTHENTICATED).
//
// Flow (see docs/ipay88_integration_guide.md):
//   1. Frontend calls this with { plan }.
//   2. We look up the server-side price, mint a unique RefNo, sign the request,
//      and record a 'pending' payment row (service role).
//   3. We call the iPay88 Checkout WebService to obtain a CheckoutID.
//   4. We return the entry.asp URL + form fields; the browser auto-submits the
//      form and iPay88 shows the QRIS page.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import {
  corsHeaders,
  ipay88Env,
  requestSignature,
  PLANS,
} from '../_shared/ipay88.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // User-scoped client to identify the caller.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized user session' }, 401);
    }

    // Validate the requested plan and pull the server-authoritative amount.
    const body = await req.json().catch(() => ({}));
    const planKey = String(body.plan ?? 'earlybird');
    const plan = PLANS[planKey];
    if (!plan) {
      return json({ error: `Unknown plan: ${planKey}` }, 400);
    }

    const { merchantCode, merchantKey, apiUrl, entryUrl, paymentId, currency } = ipay88Env();
    if (!merchantCode || !merchantKey) {
      return json({ error: 'Payment gateway is not configured' }, 500);
    }

    const amount = plan.amount;
    // Unique, <=30 chars, alphanumeric. iPay88 rejects duplicate RefNo.
    const refNo = `JIWO${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const signature = await requestSignature(merchantKey, merchantCode, refNo, amount, currency);

    // Profile for user-facing fields (name/email are optional to iPay88).
    const { data: profile } = await userClient
      .from('profiles')
      .select('nama')
      .eq('id', user.id)
      .single();

    const funcBase = `${supabaseUrl}/functions/v1`;

    // Record the pending attempt before redirecting (service role bypasses RLS).
    const admin = createClient(supabaseUrl, serviceKey);
    const { error: insErr } = await admin.from('ipay88_payments').insert({
      user_id: user.id,
      ref_no: refNo,
      plan: planKey,
      amount,
      currency,
      payment_id: paymentId,
      status: 'pending',
    });
    if (insErr) {
      console.error('payments insert failed:', insErr);
      return json({ error: 'Could not start payment' }, 500);
    }

    // Fields for both the Checkout WebService call and the entry.asp form.
    const fields: Record<string, string> = {
      MerchantCode: merchantCode,
      PaymentId: paymentId,
      RefNo: refNo,
      Amount: amount,
      Currency: currency,
      ProdDesc: plan.desc,
      UserName: profile?.nama || 'Sahabat Jiwo',
      UserEmail: user.email || 'user@jiwo.ai',
      UserContact: '08123456789',
      Remark: `plan:${planKey}`,
      Lang: 'UTF-8',
      SignatureType: 'SHA256',
      ResponseURL: `${funcBase}/ipay88-response`,
      BackendURL: `${funcBase}/ipay88-backend`,
      Signature: signature,
    };

    // Step 3: ask the Checkout WebService for a CheckoutID (Core API 2.0). This
    // is best-effort — if the WebService is unavailable we still fall back to the
    // classic OPSG direct entry.asp post, which carries the full signed field set.
    let checkoutId = '';
    try {
      const wsRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ APIVersion: '2.0', ...fields }),
      });
      const wsText = await wsRes.text();
      let wsData: any = {};
      try { wsData = JSON.parse(wsText); } catch { /* non-JSON error page */ }

      if (wsData?.CheckoutID) {
        checkoutId = String(wsData.CheckoutID);
        await admin.from('ipay88_payments')
          .update({ checkout_id: checkoutId, updated_at: new Date().toISOString() })
          .eq('ref_no', refNo);
      } else {
        console.warn('Checkout WebService returned no CheckoutID:', wsText.slice(0, 500));
      }
    } catch (e) {
      console.warn('Checkout WebService call failed, using direct entry.asp:', e);
    }

    // The browser posts these fields to entry.asp. CheckoutID is added when the
    // WebService provided one; the signed classic fields make the post valid
    // either way.
    const payload: Record<string, string> = { ...fields };
    if (checkoutId) payload.CheckoutID = checkoutId;

    return json({
      success: true,
      checkout_url: entryUrl,
      ref_no: refNo,
      payload,
    });
  } catch (err: any) {
    console.error('ipay88-checkout error:', err);
    return json({ error: err?.message || 'Internal server error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
