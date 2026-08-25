-- Phase 1: "Bot heartbeat → bot_health_log table + migration"
-- Run against the shared Supabase project (same project as tw-water-automation) —
-- confirm the project ref before applying so this doesn't land in the wrong DB.

create table if not exists public.bot_health_log (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('connecting', 'open', 'reconnecting', 'closed')),
  detail jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists bot_health_log_recorded_at_idx
  on public.bot_health_log (recorded_at desc);

-- Service-role only: the bot writes with the service role key, nobody else should
-- read/write this table client-side until Phase 3's dashboard needs it (at which
-- point add a scoped read policy, not a blanket one).
alter table public.bot_health_log enable row level security;
