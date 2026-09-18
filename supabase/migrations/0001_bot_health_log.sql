-- Phase 1: "Bot heartbeat → bot_health_log table + migration"
-- Run against the shared Supabase project (same project as tw-water-automation) —
-- confirm the project ref before applying so this doesn't land in the wrong DB.
--
-- Amended 2026-09-18 (ClickUp 86d45pbj8): aligned to 01-specification.md §4.5
-- vocabulary — event_type/logged_at, not status/recorded_at — and added the two
-- event types the spec's enum always called for but the original table never
-- captured: an explicit `heartbeat` distinct from a state-transition row, and
-- `ban_suspected`, wired to baileys-antiban's health/risk-score output. Amending
-- the original migration in place rather than adding a follow-up one because
-- Supabase credentials for this project have not landed yet (see .env — no
-- SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY set), so this table has not actually
-- been created on the shared project; there is no live data to migrate.

create table if not exists public.bot_health_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('heartbeat', 'disconnect', 'reconnect', 'ban_suspected')),
  detail jsonb not null default '{}'::jsonb,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists bot_health_log_logged_at_idx
  on public.bot_health_log (logged_at desc);

-- Service-role only: the bot writes with the service role key, nobody else should
-- read/write this table client-side until Phase 3's dashboard needs it (at which
-- point add a scoped read policy, not a blanket one).
alter table public.bot_health_log enable row level security;
