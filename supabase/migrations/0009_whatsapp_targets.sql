-- Phase 3 compose screen support: the dashboard needs to offer a checklist of
-- "which groups to send to" (spec §3.2 step 4), but the actual WhatsApp group
-- JIDs only exist in apps/whatsapp-bot's .env (COMMITTEE_GROUP_JID,
-- ANNOUNCEMENTS_JID) and aren't in Supabase at all — and most of the 8 tower
-- groups aren't even joined yet (Rollout & Launch Gate is still ahead). Rather
-- than hardcode a JID list the dashboard can't verify, this is a small
-- data-driven reference table an admin populates via the Settings screen as real
-- groups get onboarded — same "data-driven, no redeploy" posture as
-- notice_templates and approval_rules. Seeded empty on purpose.

create table if not exists public.whatsapp_targets (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('whatsapp_group', 'whatsapp_channel')),
  target_id text not null, -- the WhatsApp JID
  target_name text not null,
  is_active boolean not null default true,
  unique (target_id)
);

alter table public.whatsapp_targets enable row level security;

drop policy if exists "approvers can read whatsapp_targets" on public.whatsapp_targets;
create policy "approvers can read whatsapp_targets"
  on public.whatsapp_targets for select using (public.is_active_approver());

drop policy if exists "approvers can write whatsapp_targets" on public.whatsapp_targets;
create policy "approvers can write whatsapp_targets"
  on public.whatsapp_targets for insert with check (public.is_active_approver());

drop policy if exists "approvers can update whatsapp_targets" on public.whatsapp_targets;
create policy "approvers can update whatsapp_targets"
  on public.whatsapp_targets for update using (public.is_active_approver());
