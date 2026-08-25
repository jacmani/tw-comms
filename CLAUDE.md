# tw-comms — project instructions for Claude Code

TWAOA (Trinity World Apartment Owners Association) notice/announcement broadcast
tool. Monorepo: `apps/whatsapp-bot` (send pipeline, Baileys-based), `apps/web`
(dashboard, Phase 3 — not built yet), `packages/shared`, `supabase/migrations`.

Read `docs/decisions/2026-08-whatsapp-approach-research.md` and
`docs/decisions/2026-08-25-build-progress.md` before making any architecture
decisions — they cover why this uses Baileys (an accepted, temporary risk, not an
oversight) and where the isolation boundary is if it needs to move to the official
WhatsApp Cloud API later (`apps/whatsapp-bot/src/connection.ts` + `src/send.ts` only).

## Ground rules

- **Never pair a real Association number for casual testing.** Use a spare/test
  number. See the research doc for why.
- **Don't touch the `tw-water-automation` repo** — separate project, shared Supabase
  instance only.
- `apps/whatsapp-bot/auth_state/` is a live login session, not a config file — never
  commit it, never paste its contents anywhere, treat it like a credential.
- A task's "Explicitly out of scope" section is a hard boundary, not a suggestion —
  if a task says don't scaffold UI yet, don't, even if it'd be convenient right now.
- If a task is ambiguous or you're blocked on a decision only a human can make
  (money, legal/compliance, committee approval, an external account), stop and say
  so in the ClickUp comment rather than guessing and moving on.

## Working from ClickUp

This project's task list lives in ClickUp, not GitHub Issues — Workspace →
Team Space → 📲 TW Comms folder (folder_id `901610821420`), organized into phase
lists (Phase 0 Human Prerequisites, Phase 1 Core Send Pipeline & Bot Resilience,
Phase 2 Approval Workflow, Phase 3 Dashboard, Phase 4 Image Generation, Phase 5
Analytics/Ads/Revenue, Rollout & Launch Gate, Bugs & Findings).

Tasks are tagged `[agent]` or `[human]` in their title:

- **`[agent]` tasks are yours to pick up and implement.** Work phase-in-order —
  don't start a Phase 2 task while Phase 1's exit gate (the 7-day test-send window)
  is still open, unless explicitly told to get ahead of it.
- **`[human]` tasks are not yours** — they're account signups, money decisions,
  physical SIM cards, committee approvals. Don't attempt them. If an `[agent]` task
  is blocked on one, say so and stop rather than working around it.
- Before starting an `[agent]` task, read its full description on ClickUp — most
  have explicit "Acceptance Criteria" and "Explicitly out of scope" sections that
  override your own judgment about scope.

**Keep ClickUp in sync as you go — this is not optional bookkeeping, it's how the
human tracks what's actually done:**

1. When you start a task, set its status to "in progress".
2. When you finish, add a comment summarizing what you built/changed (file paths,
   what's verified vs. not) and set status to "in progress" still if anything in
   its acceptance criteria needs a human to verify (e.g. a live WhatsApp pairing
   test) — only move it further if you're confident every acceptance criterion is
   actually met, not just coded.
3. If you find a gap ClickUp doesn't cover (a missing task, an unclear dependency,
   something that should block a later phase), say so in a comment on the nearest
   relevant task rather than silently deciding for the team — this project has
   already had real gaps found this way (Phases 2–5 currently have zero tasks
   defined; flag rather than freelance an entire phase's scope).

## Local setup

See root `README.md` for install/run/pairing instructions. `pnpm install` and any
GitHub/hosting steps need a normal, unrestricted network — this has already tripped
up sandboxed environments once (see the build-progress doc).
