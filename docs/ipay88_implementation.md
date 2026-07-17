# iPay88 QRIS — Implementasi (Supabase Edge + Vite)

Implementasi nyata dari panduan di [`ipay88_integration_guide.md`](./ipay88_integration_guide.md),
memakai **Supabase Edge Functions** sebagai backend (Opsi 4 pada panduan) karena
Jiwo tidak punya server Express terpisah. Mengikuti dokumentasi iPay88 Core API —
**OPSG versi 2013** (alur `entry.asp` dengan tanda tangan SHA256).

## Arsitektur

```
Frontend (Vite)                Supabase Edge (Deno)              iPay88
──────────────────             ─────────────────────             ──────────
PremiumSheet
  └─ startIpay88Checkout() ──► ipay88-checkout  (JWT on)
                                 • harga dari server (anti-tamper)
                                 • buat RefNo unik
                                 • Signature SHA256
                                 • insert payments (pending)
                                 • POST Checkout WebService ────► CheckoutID
        ◄── {checkout_url, payload} ──┘
  auto-submit form POST ─────────────────────────────────────► entry.asp (QRIS)
                                                                 │
  user scan QRIS ...                                             │
                                ipay88-backend (JWT off) ◄─────── BackendURL (server→server)
                                 • verifikasi Signature
                                 • payments → success
                                 • profiles.is_premium = true
                                 • balas "RECEIVEOK"
  /result  ◄── 302 ── ipay88-response (JWT off) ◄────────────── ResponseURL (redirect browser)
   └─ polling payments row → tampil sukses/gagal
```

## File yang dibuat / diubah

| File | Peran |
|------|-------|
| `supabase/migrations/20260716000000_ipay88_payments.sql` | tabel `payments` + kolom `profiles.premium_until` + RLS |
| `supabase/functions/_shared/ipay88.ts` | helper signature, env, peta harga (`PLANS`) |
| `supabase/functions/ipay88-checkout/index.ts` | inisiasi checkout (terautentikasi) |
| `supabase/functions/ipay88-backend/index.ts` | webhook otoritatif → grant premium |
| `supabase/functions/ipay88-response/index.ts` | redirect browser ke `/result` |
| `supabase/config.toml` | `verify_jwt=false` untuk webhook |
| `src/lib/ipay88.ts` | pemicu checkout di frontend |
| `src/components/PremiumSheet.tsx` | tombol "Bayar dengan QRIS" |
| `src/pages/PaymentResult.tsx` + route `/result` | halaman hasil |

## Keamanan (penting)

- **MerchantKey tidak pernah** ada di kode frontend. Signature dihitung hanya di Edge Function.
- **Amount ditentukan server** lewat `PLANS`; klien hanya mengirim nama plan.
- Premium hanya diberikan di `ipay88-backend` **setelah** signature callback lolos verifikasi.
- Webhook tetap balas `RECEIVEOK` walau gagal, supaya iPay88 tidak retry tanpa henti.

## Deploy & set secret (sandbox)

```bash
# 1. Migrasi DB
supabase db push

# 2. Secrets untuk Edge Functions (server only — jangan taruh di VITE_*)
supabase secrets set \
  IPAY88_MERCHANT_CODE=ID02064 \
  IPAY88_MERCHANT_KEY=5vOy5imq5v \
  IPAY88_API_URL=https://sandbox.ipay88.co.id/ePayment/WebService/PaymentAPI/Checkout \
  PUBLIC_BASE_URL=http://localhost:5173
# (opsional) IPAY88_PAYMENT_ID=78   # QRIS sandbox Nobu; prod = 120

# 3. Deploy functions
supabase functions deploy ipay88-checkout
supabase functions deploy ipay88-backend
supabase functions deploy ipay88-response
```

> **Catatan URL callback:** `ResponseURL`/`BackendURL` otomatis diarahkan ke
> `https://<project>.supabase.co/functions/v1/ipay88-{response,backend}` — sudah
> publik dan bisa dijangkau iPay88. Pastikan URL ini terdaftar di dashboard merchant
> iPay88 bila diminta whitelist.

## Uji di sandbox

1. Jalankan `npm run dev`, login, buka sheet Premium, tekin **Bayar dengan QRIS**.
2. Browser ter-redirect ke halaman QRIS sandbox iPay88.
3. Selesaikan pembayaran memakai simulator/sandbox iPay88.
4. iPay88 memanggil `ipay88-backend` (grant premium) lalu redirect ke `/result`.
5. `/result` polling baris `payments` → menampilkan **Pembayaran Berhasil** dan
   `profiles.is_premium` menjadi `true`.

Verifikasi manual signature: <https://payment.ipay88.co.id/epayment/testing/TestSignaturev2.asp>

### Catatan saat localhost

`BackendURL`/`ResponseURL` menunjuk ke Edge Functions (publik), jadi callback tetap
sampai walau frontend di `localhost`. Yang harus dijangkau publik adalah fungsi
Supabase, bukan mesin lokalmu. `PUBLIC_BASE_URL` cukup diisi origin frontend
(mis. `http://localhost:5173`) agar redirect akhir mendarat di tab yang sama.
