-- Phase 2: "Design notices + approvals Supabase schema" (ClickUp 86d44wjp8)
-- Run against the shared Supabase project (same project as tw-water-automation) —
-- confirm the project ref before applying so this doesn't land in the wrong DB.
--
-- Per 01-specification.md §4.5. Two tables from that section are deliberately NOT
-- created here: `advertisements` and `ad_slots` are Phase 5 (Analytics/Ads/Revenue)
-- scope, still pending the governance/GST decision noted in
-- docs/decisions/2026-08-26-clickup-audit.md — creating them now would be building
-- ahead of a decision that isn't made yet.
--
-- `notice_approvals.approver_id` references `public.committee_members`, which this
-- repo does not own or migrate — per §3.1 this project reuses the committee registry
-- already present in the shared project. If that table doesn't exist yet under that
-- exact name, this migration will fail at apply time; that's a signal to reconcile
-- names with tw-water-automation's schema before retrying, not something to guess at
-- from here.

create table if not exists public.notice_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('notice', 'advertisement', 'emergency', 'event')),
  body_template text not null,
  default_image_template_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.notice_templates (id),
  title text not null,
  body text not null,
  image_url text,
  category text not null check (category in ('notice', 'advertisement', 'emergency', 'event')),
  target_groups jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (
    status in ('draft', 'pending_approval', 'approved', 'sending', 'sent', 'failed', 'rejected')
  ),
  created_by uuid,
  created_at timestamptz not null default now(),
  mygate_posted boolean not null default false,
  mygate_posted_at timestamptz
);

create index if not exists notices_status_idx on public.notices (status);
create index if not exists notices_created_at_idx on public.notices (created_at desc);

-- Data-driven approval routing (req #8) — "who approves what" is a config row, not
-- a redeploy. Seeded below with the §5.1 defaults.
create table if not exists public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null unique check (category in ('notice', 'advertisement', 'emergency', 'event')),
  required_roles jsonb not null default '[]'::jsonb
);

insert into public.approval_rules (category, required_roles) values
  ('notice', '["president", "secretary", "vp", "tower_gc_chair"]'::jsonb),
  ('event', '["president", "secretary", "vp", "tower_gc_chair"]'::jsonb),
  ('advertisement', '["president", "secretary"]'::jsonb),
  -- Emergency Alerts bypass approval per spec §5.1 — empty required_roles is the
  -- signal the send pipeline checks to skip straight to "approved".
  ('emergency', '[]'::jsonb)
on conflict (category) do nothing;

create table if not exists public.notice_approvals (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices (id) on delete cascade,
  approver_id uuid not null references public.committee_members (id),
  action text not null check (action in ('approved', 'rejected')),
  channel text not null check (channel in ('email', 'whatsapp_group')),
  comment text,
  decided_at timestamptz not null default now(),
  approval_link_token text
);

create index if not exists notice_approvals_notice_id_idx on public.notice_approvals (notice_id);
-- One decision per (notice, approver) — first qualifying tap wins per spec §5.2;
-- this is the DB-level backstop for the race-condition handling the send pipeline
-- also needs at the application layer (86d44wm66 "auto-send on threshold met").
create unique index if not exists notice_approvals_notice_approver_uidx
  on public.notice_approvals (notice_id, approver_id);

create table if not exists public.notice_sends (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices (id) on delete cascade,
  target_type text not null check (target_type in ('whatsapp_group', 'whatsapp_channel', 'mygate_manual')),
  target_id text not null,
  target_name text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  reaction_count integer not null default 0,
  reply_count integer not null default 0
);

create index if not exists notice_sends_notice_id_idx on public.notice_sends (notice_id);

alter table public.notice_templates enable row level security;
alter table public.notices enable row level security;
alter table public.approval_rules enable row level security;
alter table public.notice_approvals enable row level security;
alter table public.notice_sends enable row level security;

-- Service-role only for now, same posture as 0001_bot_health_log.sql — the bot and
-- (once it exists) a server-side dashboard API write with the service role key.
-- Phase 3's committee login (86d44wma8) adds scoped policies for authenticated
-- committee members once that auth flow exists; adding them now would be a policy
-- nobody can exercise yet.
