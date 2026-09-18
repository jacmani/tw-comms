-- Phase 2: "Approver allowlist mapped to committee roles" (ClickUp 86d44wjt4)
-- Run against the shared Supabase project.
--
-- Deliberately created empty — no seed rows. Populating it with real phone
-- numbers/JIDs is blocked on a human decision (ClickUp 86d44wjr7, "Provide
-- approver phone numbers/JIDs for the allowlist"); hardcoding placeholder numbers
-- here would silently create fake approvers. Phase 3's committee-login task
-- (86d44wma8) gets an admin view to populate this once real numbers land.
--
-- `role` is free-text matched against approval_rules.required_roles (see
-- 0002_notices_and_approvals.sql) rather than an enum, so a new committee role
-- doesn't require a migration — same "data-driven, no redeploy" posture as
-- approval_rules itself.

create table if not exists public.approver_allowlist (
  id uuid primary key default gen_random_uuid(),
  committee_member_id uuid not null references public.committee_members (id),
  whatsapp_jid text,
  display_name text not null,
  role text not null,
  is_active boolean not null default true,
  added_at timestamptz not null default now(),
  unique (committee_member_id)
);

create index if not exists approver_allowlist_role_idx on public.approver_allowlist (role) where is_active;
create unique index if not exists approver_allowlist_jid_uidx
  on public.approver_allowlist (whatsapp_jid) where whatsapp_jid is not null;

alter table public.approver_allowlist enable row level security;
-- Service-role only until Phase 3 auth exists, same posture as the other Phase 2 tables.
