-- Enable Vector extension for RAG embeddings
create extension if not exists vector with schema public;

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nama text not null,
  baseline_assessment jsonb,
  consent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile" 
  on public.profiles for delete 
  using (auth.uid() = id);

-- 2. MOOD CHECKINS TABLE
create table if not exists public.mood_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid() not null,
  mood text not null, -- e.g., 'senang', 'tenang', 'cemas', 'sedih', 'lelah'
  anxiety_level integer not null, -- 1 to 5
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mood_checkins enable row level security;

drop policy if exists "Users can manage their own mood checkins" on public.mood_checkins;
create policy "Users can manage their own mood checkins" 
  on public.mood_checkins for all 
  using (auth.uid() = user_id);

-- 3. JOURNAL ENTRIES TABLE
create table if not exists public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid() not null,
  type text not null, -- 'mood_story', 'gratitude', 'future_self'
  content text not null,
  mood_tag text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.journal_entries enable row level security;

drop policy if exists "Users can manage their own journal entries" on public.journal_entries;
create policy "Users can manage their own journal entries" 
  on public.journal_entries for all 
  using (auth.uid() = user_id);

-- 4. CHAT MESSAGES TABLE
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid() not null,
  role text not null, -- 'user', 'assistant'
  content text not null,
  flagged_crisis boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

drop policy if exists "Users can manage their own chat messages" on public.chat_messages;
create policy "Users can manage their own chat messages" 
  on public.chat_messages for all 
  using (auth.uid() = user_id);

-- 5. RESCUE SESSIONS TABLE
create table if not exists public.rescue_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade default auth.uid() not null,
  completed boolean default false not null,
  duration_sec integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.rescue_sessions enable row level security;

drop policy if exists "Users can manage their own rescue sessions" on public.rescue_sessions;
create policy "Users can manage their own rescue sessions" 
  on public.rescue_sessions for all 
  using (auth.uid() = user_id);

-- 6. RAG DOCUMENTS TABLE
create table if not exists public.rag_documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.rag_documents enable row level security;

drop policy if exists "Anyone can view RAG documents" on public.rag_documents;
create policy "Anyone can view RAG documents" 
  on public.rag_documents for select 
  using (true);

-- 7. RAG CHUNKS TABLE
create table if not exists public.rag_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.rag_documents(id) on delete cascade not null,
  content text not null,
  embedding vector(1536), -- Standard OpenAI/CoHere dimensions
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.rag_chunks enable row level security;

drop policy if exists "Anyone can view RAG chunks" on public.rag_chunks;
create policy "Anyone can view RAG chunks" 
  on public.rag_chunks for select 
  using (true);

-- AUTOMATIC PROFILE CREATION TRIGGER & FUNCTION (Recreated cleanly)
drop trigger if exists on_auth_user_created on auth.users;
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Check if profile already exists before inserting
  if not exists (select 1 from public.profiles where id = new.id) then
    insert into public.profiles (id, nama, baseline_assessment, consent_at)
    values (
      new.id, 
      coalesce(new.raw_user_meta_data->>'nama', new.raw_user_meta_data->>'full_name', 'Sahabat Jiwo'),
      '{}'::jsonb,
      now()
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- BACKFILL EXISTING USERS
insert into public.profiles (id, nama, baseline_assessment, consent_at)
select 
  id, 
  coalesce(raw_user_meta_data->>'nama', raw_user_meta_data->>'full_name', 'Sahabat Jiwo'),
  '{}'::jsonb,
  now()
from auth.users
where id not in (select id from public.profiles);
