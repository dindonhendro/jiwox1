// iPay88 QRIS — Response callback (PUBLIC, no JWT).
//
// After payment iPay88 redirects the customer's BROWSER here (POST). This is a
// UX-only hop: the authoritative status update happens in ipay88-backend. Here we
// simply bounce the browser to the SPA's /result page with a friendly summary.
//
// Deploy with verify_jwt = false (see supabase/config.toml).

async function parseBody(req: Request): Promise<Record<string, string>> {
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
  const frontendBase = (Deno.env.get('PUBLIC_BASE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');

  // iPay88 may also GET this URL in some flows; support both.
  let p: Record<string, string> = {};
  if (req.method === 'POST') {
    p = await parseBody(req);
  } else {
    const u = new URL(req.url);
    for (const [k, v] of u.searchParams.entries()) p[k] = v;
  }

  const status = p.Status ?? p.TransactionStatus ?? '';
  const refNo = p.RefNo ?? '';
  const amount = p.Amount ?? '';
  const errDesc = p.ErrDesc ?? '';
  const transId = p.TransId ?? '';
  const isSuccess = status === '1';

  const params = new URLSearchParams({
    status: isSuccess ? 'success' : (status === '6' ? 'pending' : 'failed'),
    refNo,
    amount,
    errDesc,
    transId,
  });

  const location = `${frontendBase}/result?${params.toString()}`;
  return new Response(null, { status: 302, headers: { Location: location } });
});
