// Shared iPay88 helpers used by the checkout / backend / response functions.
// Reference: iPay88 Core API — OPSG versi 2013 (entry.asp flow).
//
// SECURITY: MerchantKey is only ever read from env here on the server. It must
// never be sent to or reconstructed in the browser.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// SHA-256 hex of an arbitrary string (Web Crypto — available in Deno Edge).
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Request signature sent to iPay88 with the Checkout / entry.asp payload:
//   ||MerchantKey||MerchantCode||RefNo||Amount||Currency||
export function requestSignature(
  merchantKey: string,
  merchantCode: string,
  refNo: string,
  amount: string,
  currency: string,
): Promise<string> {
  return sha256Hex(
    `||${merchantKey}||${merchantCode}||${refNo}||${amount}||${currency}||`,
  );
}

// Backend callback (BackendURL) signature returned by iPay88:
//   ||MerchantKey||MerchantCode||PaymentId||RefNo||Amount||Currency||Status||
export function backendSignature(
  merchantKey: string,
  merchantCode: string,
  paymentId: string,
  refNo: string,
  amount: string,
  currency: string,
  status: string,
): Promise<string> {
  return sha256Hex(
    `||${merchantKey}||${merchantCode}||${paymentId}||${refNo}||${amount}||${currency}||${status}||`,
  );
}

// Resolve the iPay88 environment from the configured API URL. Falls back to
// sandbox so a missing/misconfigured env can never accidentally hit production.
export function ipay88Env() {
  const merchantCode = Deno.env.get('IPAY88_MERCHANT_CODE') ?? '';
  const merchantKey = Deno.env.get('IPAY88_MERCHANT_KEY') ?? '';
  const apiUrl =
    Deno.env.get('IPAY88_API_URL') ??
    'https://sandbox.ipay88.co.id/ePayment/WebService/PaymentAPI/Checkout';

  const isProd = !apiUrl.includes('sandbox');

  const entryUrl = isProd
    ? 'https://payment.ipay88.co.id/ePayment/entry.asp'
    : 'https://sandbox.ipay88.co.id/ePayment/entry.asp';

  // QRIS Dynamic PaymentId. Prod = 120; sandbox uses Nobu QRIS = 78 unless
  // overridden. Override with IPAY88_PAYMENT_ID for other QRIS acquirers.
  const paymentId =
    Deno.env.get('IPAY88_PAYMENT_ID') ?? (isProd ? '120' : '78');

  return { merchantCode, merchantKey, apiUrl, entryUrl, paymentId, isProd, currency: 'IDR' };
}

// Server-authoritative price map. The client only names a plan; the amount is
// decided here so a tampered request cannot change what is charged.
// IDR amounts carry no decimals (integer string).
export const PLANS: Record<string, { amount: string; days: number; desc: string }> = {
  earlybird: { amount: '19000',  days: 30,  desc: 'Jiwo Premium (Early Bird) — 1 bulan' },
  monthly:   { amount: '29000',  days: 30,  desc: 'Jiwo Premium — 1 bulan' },
  yearly:    { amount: '179000', days: 365, desc: 'Jiwo Premium — 1 tahun' },
};
