-- Phase 4 (Image Generation) schema — ClickUp 86d44wmfd (provider integration),
-- 86d44wmg1 (pre-send moderation), 86d44wmgv (cost tracking + budget alert),
-- 86d44wmh6 (template presets library).
--
-- Free-tier providers only, per Jacob's decision (no budget/provider gate to wait
-- on) — see packages/image-gen. Settings (which provider is active, fallback
-- order) live in `image_gen_provider_settings`; API keys/tokens live in the
-- separate `image_gen_provider_secrets` table so they can be locked down tighter
-- (service-role only — never exposed via the approver-read RLS policies in
-- 0007_committee_login_rls.sql) without complicating the settings-read policy.

create table if not exists public.image_gen_provider_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('cloudflare-workers-ai', 'gemini-nano-banana', 'pollinations')),
  enabled boolean not null default false,
  priority integer not null default 100 -- lower = tried first in the fallback order
);

insert into public.image_gen_provider_settings (provider, enabled, priority) values
  ('cloudflare-workers-ai', true, 1),   -- default/primary per Jacob's decision (free published tier, FLUX.1 Schnell)
  ('gemini-nano-banana', false, 2),      -- optional secondary, higher quality, less durable free tier
  ('pollinations', true, 3)              -- no-key emergency fallback, no SLA
on conflict (provider) do nothing;

create table if not exists public.image_gen_provider_secrets (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  key_name text not null,
  key_value text not null,
  updated_at timestamptz not null default now(),
  unique (provider, key_name)
);

create table if not exists public.image_gen_cost_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  notice_id uuid references public.notices (id) on delete set null,
  -- Free-tier providers don't bill per-call, so this is a usage/quota estimate
  -- (e.g. Cloudflare Workers AI "neurons" or a request count), not a currency
  -- amount — see packages/image-gen's cost-tracking module for the actual unit
  -- per provider. Kept numeric + generic rather than assuming a currency.
  usage_estimate numeric not null default 0,
  usage_unit text not null default 'requests',
  created_at timestamptz not null default now()
);

create index if not exists image_gen_cost_log_provider_created_at_idx
  on public.image_gen_cost_log (provider, created_at desc);

create table if not exists public.poster_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Layout/style knobs (accent color, tower badge position, etc.) — jsonb so new
  -- preset fields don't need a migration, same posture as notice_templates.
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table public.image_gen_provider_settings enable row level security;
alter table public.image_gen_provider_secrets enable row level security;
alter table public.image_gen_cost_log enable row level security;
alter table public.poster_presets enable row level security;

-- Settings and presets are readable by any allowlisted approver (the dashboard's
-- Settings page, spec-adjacent) — secrets are NOT, service-role only.
drop policy if exists "approvers can read image_gen_provider_settings" on public.image_gen_provider_settings;
create policy "approvers can read image_gen_provider_settings"
  on public.image_gen_provider_settings for select using (public.is_active_approver());

drop policy if exists "approvers can write image_gen_provider_settings" on public.image_gen_provider_settings;
create policy "approvers can write image_gen_provider_settings"
  on public.image_gen_provider_settings for update using (public.is_active_approver());

drop policy if exists "approvers can read poster_presets" on public.poster_presets;
create policy "approvers can read poster_presets"
  on public.poster_presets for select using (public.is_active_approver());

drop policy if exists "approvers can read image_gen_cost_log" on public.image_gen_cost_log;
create policy "approvers can read image_gen_cost_log"
  on public.image_gen_cost_log for select using (public.is_active_approver());
