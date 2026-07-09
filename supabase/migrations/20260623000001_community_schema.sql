-- 1. COMMUNITY POSTS TABLE
create table if not exists public.community_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  anonymous boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for community_posts
alter table public.community_posts enable row level security;

drop policy if exists "Anyone authenticated can view community posts" on public.community_posts;
create policy "Anyone authenticated can view community posts"
  on public.community_posts for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own community posts" on public.community_posts;
create policy "Users can insert their own community posts"
  on public.community_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own community posts" on public.community_posts;
create policy "Users can update their own community posts"
  on public.community_posts for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own community posts" on public.community_posts;
create policy "Users can delete their own community posts"
  on public.community_posts for delete
  to authenticated
  using (auth.uid() = user_id);


-- 2. POST LIKES TABLE
create table if not exists public.post_likes (
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

-- Enable RLS for post_likes
alter table public.post_likes enable row level security;

drop policy if exists "Anyone authenticated can view post likes" on public.post_likes;
create policy "Anyone authenticated can view post likes"
  on public.post_likes for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own likes" on public.post_likes;
create policy "Users can insert their own likes"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own likes" on public.post_likes;
create policy "Users can delete their own likes"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);


-- 3. COMMUNITY COMMENTS TABLE
create table if not exists public.community_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for community_comments
alter table public.community_comments enable row level security;

drop policy if exists "Anyone authenticated can view community comments" on public.community_comments;
create policy "Anyone authenticated can view community comments"
  on public.community_comments for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own comments" on public.community_comments;
create policy "Users can insert their own comments"
  on public.community_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comments" on public.community_comments;
create policy "Users can update their own comments"
  on public.community_comments for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.community_comments;
create policy "Users can delete their own comments"
  on public.community_comments for delete
  to authenticated
  using (auth.uid() = user_id);


-- 4. WORKSHOPS TABLE
create table if not exists public.workshops (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  instructor text not null,
  date text not null,
  time text not null,
  link text not null,
  category text not null, -- 'Yoga', 'Art Therapy', 'Sleep Circle', etc.
  max_participants int default 30 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for workshops
alter table public.workshops enable row level security;

drop policy if exists "Anyone authenticated can view workshops" on public.workshops;
create policy "Anyone authenticated can view workshops"
  on public.workshops for select
  to authenticated
  using (true);


-- 5. WORKSHOP REGISTRATIONS TABLE
create table if not exists public.workshop_registrations (
  id uuid default gen_random_uuid() primary key,
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (workshop_id, user_id)
);

-- Enable RLS for workshop_registrations
alter table public.workshop_registrations enable row level security;

drop policy if exists "Users can view their own registrations" on public.workshop_registrations;
create policy "Users can view their own registrations"
  on public.workshop_registrations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can register themselves to workshops" on public.workshop_registrations;
create policy "Users can register themselves to workshops"
  on public.workshop_registrations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can cancel their registrations" on public.workshop_registrations;
create policy "Users can cancel their registrations"
  on public.workshop_registrations for delete
  to authenticated
  using (auth.uid() = user_id);


-- 6. INSERT SEED DATA FOR MOCK WORKSHOPS
insert into public.workshops (title, description, instructor, date, time, link, category, max_participants)
values 
  ('Yoga Nidra: Istirahat Mental', 'Sesi relaksasi otot mendalam berbaring untuk mengurangi burnout dan mengembalikan kebugaran mental.', 'Rian Hidayat, M.Psi.', 'Sabtu, 27 Jun', '20:00 - 21:00', 'https://meet.google.com/mock-yoga-nidra', 'Yoga', 40),
  ('Art Therapy Circle: Gambar Cemasmu', 'Tumpahkan kecemasanmu dalam bentuk coretan warna kreatif dibimbing langsung bersama psikolog.', 'Sari Puspita, M.Psi.', 'Minggu, 28 Jun', '16:00 - 17:15', 'https://meet.google.com/mock-art-therapy', 'Art Therapy', 25),
  ('Sleep Better Circle: Atasi Insomnia', 'Diskusi santai dan tips praktis mengatasi overthinking malam hari serta membangun ritual tidur tenang.', 'dr. Budi Setiawan, Sp.KJ', 'Selasa, 30 Jun', '20:30 - 21:30', 'https://meet.google.com/mock-sleep-circle', 'Sleep Circle', 50)
on conflict do nothing;
