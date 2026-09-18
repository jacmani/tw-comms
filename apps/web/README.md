# apps/web

Phase 3 dashboard — SvelteKit (see `docs/specs/07-frontend-framework-decision.md`
for why SvelteKit over the originally-spec'd Next.js). Compose, Templates,
History, Bot Status, Settings (Phase 4 image-gen provider config), and Consent
(the 2026-08-26 audit gap's admin view).

## Local setup

Uses the same root `.env` as `apps/whatsapp-bot` — see `.env.example` for the
`PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY` vars this app needs (in addition
to `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` the bot uses).

```
pnpm --filter @tw-comms/web dev
```

Login is Supabase Auth magic-link, gated to `approver_allowlist` (see
`supabase/migrations/0007_committee_login_rls.sql`) — until that table has real
rows (blocked on ClickUp 86d44wjr7), nobody can actually get past `/login`, which
is expected, not a bug.

## Known gaps (see ClickUp comments for detail)

- Compose is a single condensed page, not spec `02-ui-design.md` §3.2's 5-step
  wizard — same fields, no pagination.
- The poster-generation sub-flow (§3.3) isn't wired into Compose yet — that's
  Phase 4's image-gen adapters, built separately in `packages/image-gen`.
- History's calendar heatmap (reused from `tw-water-automation` per the UI doc's
  component-reuse map) isn't included — that repo isn't available in this
  workspace to pull the component from.
- Settings' "set provider key" action needs a service-role write path that isn't
  wired up yet (the rest of this app deliberately runs on the anon/RLS-scoped
  client) — see the code comment in `settings/+page.server.ts`.
