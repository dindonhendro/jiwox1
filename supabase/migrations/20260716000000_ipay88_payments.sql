-- iPay88 QRIS payment tracking + premium expiry.
-- Every checkout attempt is recorded as one row keyed by the merchant RefNo we
-- send to iPay88. The webhook (BackendURL) flips the row to 'success' and grants
-- premium; the browser redirect (ResponseURL) only reads it.

-- When premium was purchased through, so premium can lapse and be renewed.
-- is_premium (from 20260712000000_usage_and_premium.sql) stays as the fast flag
-- the chat function already checks.
alter table public.profiles add column if not exists premium_until timestamptz;

-- Dedicated table name (ipay88_payments) to avoid colliding with any other
-- `payments` table that may already exist in this database.
create table if not exists public.ipay88_payments (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  ref_no       text not null unique,           -- our merchant reference sent to iPay88
  plan         text not null,                  -- 'monthly' | 'yearly' | 'earlybird'
  amount       text not null,                  -- integer string, no decimals for IDR (e.g. "19000")
  currency     text not null default 'IDR',
  payment_id   text,                           -- iPay88 PaymentId (QRIS = 120 / sandbox 78)
  status       text not null default 'pending', -- 'pending' | 'success' | 'failed'
  checkout_id  text,                           -- iPay88 CheckoutID from the Checkout WebService
  trans_id     text,                           -- iPay88 TransId from the backend callback
  auth_code    text,
  err_desc     text,
  raw          jsonb,                           -- last raw callback payload for debugging
  created_at   timestamptz default timezone('utc', now()) not null,
  updated_at   timestamptz default timezone('utc', now()) not null
);

create index if not exists ipay88_payments_user_id_idx on public.ipay88_payments(user_id);
create index if not exists ipay88_payments_ref_no_idx  on public.ipay88_payments(ref_no);

alter table public.ipay88_payments enable row level security;

-- Users may read their own payments (the /result page polls this). All writes go
-- through edge functions using the service-role key, which bypasses RLS, so no
-- insert/update policy is granted to end users on purpose.
drop policy if exists "own ipay88 payments read" on public.ipay88_payments;
create policy "own ipay88 payments read"
  on public.ipay88_payments for select
  using (auth.uid() = user_id);
