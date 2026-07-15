// One-shot migration runner. Connects directly to Postgres via SUPABASE_DB_URL
// and applies the usage-counters + premium schema. Guarded by the service-role
// key. Deploy → invoke once → delete this function.
import postgres from 'https://esm.sh/postgres@3.4.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STATEMENTS = [
  `alter table public.profiles add column if not exists is_premium boolean not null default false`,
  `create table if not exists public.usage_counters (
     user_id uuid not null references public.profiles(id) on delete cascade,
     day date not null default (now() at time zone 'utc')::date,
     chat_count integer not null default 0,
     journal_count integer not null default 0,
     primary key (user_id, day)
   )`,
  `alter table public.usage_counters enable row level security`,
  `drop policy if exists "own usage read" on public.usage_counters`,
  `create policy "own usage read" on public.usage_counters for select using (auth.uid() = user_id)`,
  `create or replace function public.increment_usage(p_kind text)
   returns integer language plpgsql security definer set search_path = public as $fn$
   declare v_uid uuid := auth.uid(); v_day date := (now() at time zone 'utc')::date; v_new integer;
   begin
     if v_uid is null then raise exception 'not authenticated'; end if;
     insert into public.usage_counters (user_id, day, chat_count, journal_count)
     values (v_uid, v_day, case when p_kind='chat' then 1 else 0 end, case when p_kind='journal' then 1 else 0 end)
     on conflict (user_id, day) do update
       set chat_count    = public.usage_counters.chat_count    + (case when p_kind='chat'    then 1 else 0 end),
           journal_count = public.usage_counters.journal_count + (case when p_kind='journal' then 1 else 0 end)
     returning (case when p_kind='chat' then chat_count else journal_count end) into v_new;
     return v_new;
   end; $fn$`,
  `create or replace function public.get_usage_today()
   returns table (chat_count integer, journal_count integer)
   language sql stable security definer set search_path = public as $fn$
     select coalesce((select uc.chat_count from public.usage_counters uc where uc.user_id = auth.uid() and uc.day = (now() at time zone 'utc')::date),0),
            coalesce((select uc.journal_count from public.usage_counters uc where uc.user_id = auth.uid() and uc.day = (now() at time zone 'utc')::date),0);
   $fn$`,
  `grant execute on function public.increment_usage(text) to authenticated`,
  `grant execute on function public.get_usage_today() to authenticated`,
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = req.headers.get('Authorization') || '';
  if (auth !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL not available' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sql = postgres(dbUrl, { prepare: false });
  const ran: string[] = [];
  try {
    for (const stmt of STATEMENTS) {
      await sql.unsafe(stmt);
      ran.push(stmt.trim().slice(0, 48));
    }
    await sql.end();
    return new Response(JSON.stringify({ ok: true, count: ran.length, ran }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await sql.end().catch(() => {});
    return new Response(JSON.stringify({ error: String((e as any)?.message || e), ranBeforeError: ran }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
