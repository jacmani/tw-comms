-- Phase 2: "Rejection + edit-and-resend flow" (ClickUp 86d44wm6u)
--
-- A rejected notice, once edited and resubmitted, needs a clean vote count — prior
-- votes (both the rejection and any partial approvals from before it) must not
-- carry over and bias the new round, but they also shouldn't be deleted, since
-- 86d44wm7b's audit trail is supposed to show every decision across every round,
-- not just the latest. `approval_round` scopes votes per resubmission cycle
-- instead of forcing a choice between "keep history" and "count cleanly".

alter table public.notices
  add column if not exists approval_round integer not null default 1;

alter table public.notice_approvals
  add column if not exists approval_round integer not null default 1;

drop index if exists public.notice_approvals_notice_approver_uidx;
create unique index if not exists notice_approvals_notice_round_approver_uidx
  on public.notice_approvals (notice_id, approval_round, approver_id);
