-- Phase 3: "Committee login, restricted to the approvers allowlist" (ClickUp 86d44wma8)
--
-- ASSUMPTION TO VERIFY: this assumes public.committee_members has an `email`
-- column matching the address a committee member authenticates with via Supabase
-- Auth (magic link) in the dashboard. That table is owned by tw-water-automation,
-- not this repo (see 01-specification.md §3.1's "reuse the committee registry") —
-- if the real column is named differently, `is_active_approver()` below will
-- silently deny everyone rather than erroring, which will look like "nobody can
-- log in" rather than a clear schema error. Verify this against the real schema
-- before relying on it in production.
--
-- Dashboard-wide login gate, not just the Approval Queue screen — per the task's
-- literal title, any authenticated user must be an active approver_allowlist
-- entry to use the dashboard at all. This means the FM needs a row in
-- approver_allowlist too, even if their role never satisfies an approval_rules
-- requirement (allowlist membership and approval authority are two different
-- checks — see allowlist.ts's isQualifiedApprover for the latter). Flagging this
-- as a product-behavior interpretation, not a spec-mandated one, in case the FM
-- was meant to have dashboard access independent of committee membership.
--
-- `create policy` has no `if not exists` clause in Postgres, unlike `create
-- table`/`create index` — each policy is dropped-then-created instead, so this
-- migration is still safe to re-run.

create or replace function public.is_active_approver()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.approver_allowlist a
    join public.committee_members cm on cm.id = a.committee_member_id
    where a.is_active
      and cm.email = auth.jwt() ->> 'email'
  );
$$;

-- Read access for every allowlisted approver across the tables the dashboard needs.
drop policy if exists "approvers can read notice_templates" on public.notice_templates;
create policy "approvers can read notice_templates"
  on public.notice_templates for select using (public.is_active_approver());

drop policy if exists "approvers can read notices" on public.notices;
create policy "approvers can read notices"
  on public.notices for select using (public.is_active_approver());

drop policy if exists "approvers can read approval_rules" on public.approval_rules;
create policy "approvers can read approval_rules"
  on public.approval_rules for select using (public.is_active_approver());

drop policy if exists "approvers can read notice_approvals" on public.notice_approvals;
create policy "approvers can read notice_approvals"
  on public.notice_approvals for select using (public.is_active_approver());

drop policy if exists "approvers can read notice_sends" on public.notice_sends;
create policy "approvers can read notice_sends"
  on public.notice_sends for select using (public.is_active_approver());

drop policy if exists "approvers can read approver_allowlist" on public.approver_allowlist;
create policy "approvers can read approver_allowlist"
  on public.approver_allowlist for select using (public.is_active_approver());

drop policy if exists "approvers can read bot_health_log" on public.bot_health_log;
create policy "approvers can read bot_health_log"
  on public.bot_health_log for select using (public.is_active_approver());

drop policy if exists "approvers can read consent_log" on public.consent_log;
create policy "approvers can read consent_log"
  on public.consent_log for select using (public.is_active_approver());

-- Compose/Templates (§3.2, §3.4) — the FM drafts and edits from the dashboard.
drop policy if exists "approvers can write notices" on public.notices;
create policy "approvers can write notices"
  on public.notices for insert with check (public.is_active_approver());

drop policy if exists "approvers can update notices" on public.notices;
create policy "approvers can update notices"
  on public.notices for update using (public.is_active_approver());

drop policy if exists "approvers can write notice_templates" on public.notice_templates;
create policy "approvers can write notice_templates"
  on public.notice_templates for insert with check (public.is_active_approver());

drop policy if exists "approvers can update notice_templates" on public.notice_templates;
create policy "approvers can update notice_templates"
  on public.notice_templates for update using (public.is_active_approver());

-- Admin view of consent_log (Phase 3 gap) — read + record entries; the collection
-- POLICY is still a committee decision (see 0006_consent_log.sql), this only lets
-- someone with dashboard access log what they already know.
drop policy if exists "approvers can write consent_log" on public.consent_log;
create policy "approvers can write consent_log"
  on public.consent_log for insert with check (public.is_active_approver());
