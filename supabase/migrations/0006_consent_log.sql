-- Phase 3 gap (docs/decisions/2026-08-26-clickup-audit.md): resident WhatsApp
-- opt-in/opt-out tracking. DPDP Act requires explicit, channel-specific opt-in
-- consent, an honored per-message opt-out, and 7-year record retention.
--
-- This migration builds ONLY the data model + a place for an admin view to read
-- it (Phase 3's dashboard, see apps/web/src/routes/(app)/consent). It does NOT
-- decide the actual consent-collection policy or flow (how residents get asked,
-- what the opt-out mechanism looks like in practice) — that is a committee
-- decision, still open, per the audit doc. Building this now so the schema isn't
-- retrofitted later, not to pre-empt that decision.

create table if not exists public.consent_log (
  id uuid primary key default gen_random_uuid(),
  -- Phone/JID or flat number — kept as free text since the identifier scheme
  -- itself depends on the still-open collection policy.
  resident_identifier text not null,
  status text not null check (status in ('opted_in', 'opted_out', 'unknown')) default 'unknown',
  source text not null default 'manual',
  recorded_at timestamptz not null default now(),
  notes text
);

create index if not exists consent_log_resident_identifier_idx on public.consent_log (resident_identifier);
create index if not exists consent_log_recorded_at_idx on public.consent_log (recorded_at desc);

alter table public.consent_log enable row level security;
-- Service-role only for now, same posture as the other Phase 2/3 tables until
-- committee-login RLS policies land (0007).
