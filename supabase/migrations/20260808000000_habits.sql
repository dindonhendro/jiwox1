-- HABIT TRACKER
-- Daily habits plus one row per completed day. Habits carry a `stress_impact`
-- weight so the app can score how much a day's routine eases the user's stress,
-- and an optional `link_to` deep link into the calming tools already in the app.

-- 1. HABITS
create table if not exists public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid() not null,
  title text not null,
  icon text default '🌱' not null,
  -- 'calming' | 'body' | 'reflection' | 'social' | 'rest'
  category text default 'calming' not null,
  -- 1..3 — how strongly this habit is known to ease stress
  stress_impact smallint default 2 not null,
  -- optional in-app route, e.g. '/rescue' or '/journal'
  link_to text,
  sort_order integer default 0 not null,
  archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint habits_stress_impact_range check (stress_impact between 1 and 3)
);

alter table public.habits enable row level security;

drop policy if exists "Users can manage their own habits" on public.habits;
create policy "Users can manage their own habits"
  on public.habits for all
  using (auth.uid() = user_id);

create index if not exists habits_user_active_idx
  on public.habits (user_id, archived, sort_order);

-- 2. HABIT LOGS (one row per habit per completed day)
create table if not exists public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid() not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  done_on date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ticking the same habit twice in a day is a no-op, not a duplicate row.
  unique (habit_id, done_on)
);

alter table public.habit_logs enable row level security;

drop policy if exists "Users can manage their own habit logs" on public.habit_logs;
create policy "Users can manage their own habit logs"
  on public.habit_logs for all
  using (auth.uid() = user_id);

create index if not exists habit_logs_user_day_idx
  on public.habit_logs (user_id, done_on desc);
