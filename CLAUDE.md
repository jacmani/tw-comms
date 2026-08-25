# tw-comms — project instructions for Claude Code

## What this project is (read this before anything else)

TWAOA (Trinity World Apartment Owners Association) needs one reliable, official way
to get notices to residents — right now it's scattered across personal WhatsApp
forwards, paper notices, and an app not everyone opens. This project is a WhatsApp
bot that acts as the Association's official notice board, with one non-negotiable
rule: **nothing reaches residents until a committee member approves it.**

Flow: someone drafts a notice → bot posts it to a private committee approval group →
an allowlisted committee member reacts 👍 or 👎 → on approval (meeting quorum), the
bot posts it to the resident-facing announcements channel → every decision is logged
for a real audit trail.

Full plain-language version (problem statement, walkthrough) is in the root
`README.md` — read it before touching code if you're new to this project. Technical
architecture is also in `README.md`, below the plain-language section.

Governance has approved (2026-08-26) extending this later to carry sponsor
credits/ad slots on notices as a funding mechanism for Association initiatives —
that's Phase 5, and it's real scope now, not a maybe.

## Read these before making any architecture decisions

- `docs/decisions/2026-08-whatsapp-approach-research.md` — why this uses Baileys (an
  accepted, temporary risk, not an oversight), and where the isolation boundary is
  if it needs to move to the official WhatsApp Cloud API later
  (`apps/whatsapp-bot/src/connection.ts` + `src/send.ts` only).
- `docs/decisions/2026-08-25-build-progress.md` — hosting research (Oracle Free Tier
  vs GCP e2-micro vs paid VPS) and a known environment gotcha (Baileys pulls a
  dependency from a GitHub tarball, which fails in network-restricted sandboxes).

## Ground rules

- **Never pair a real Association number for casual testing.** Use a spare/test
  number. See the research doc for why.
- **Don't touch the `tw-water-automation` repo** — separate project, shared Supabase
  instance only.
- `apps/whatsapp-bot/auth_state/` is a live login session, not a config file — never
  commit it, never paste its contents anywhere, treat it like a credential.
- A task's "Explicitly out of scope" section is a hard boundary, not a suggestion —
  if a task says don't build a UI yet, don't, even if it'd be convenient right now.
- A task's "Blocked by" / "Depends on" note means exactly that — check whether the
  blocking task is actually done before starting, don't assume it's fine because the
  code would technically compile without it.
- If a task is ambiguous or you're blocked on a decision only a human can make
  (money, legal/compliance, committee approval, an external account), stop and say
  so in the ClickUp comment rather than guessing and moving on. Phase 5 in
  particular has real compliance dependencies (GST/tax treatment of ad revenue) —
  do not wire up live payments ahead of that being resolved, sandbox/test mode only.

## Working from ClickUp

This project's task list lives in ClickUp, not GitHub Issues — Workspace →
Team Space → 📲 TW Comms folder (folder_id `901610821420`), organized into phase
lists: Phase 0 (Human Prerequisites), Phase 1 (Core Send Pipeline & Bot Resilience),
Phase 2 (Approval Workflow), Phase 3 (Dashboard), Phase 4 (Image Generation),
Phase 5 (Analytics, Reports, Ad Slots, Revenue), Rollout & Launch Gate, Bugs &
Findings. Phases 2–5 were fully populated with detailed tasks on 2026-08-26 — each
has Acceptance Criteria, Explicitly-out-of-scope notes, and Blocked-by/Depends-on
relationships spelled out in its description; read the full task before starting,
not just the title.

Tasks are tagged `[agent]` or `[human]` in their title:

- **`[agent]` tasks are yours to pick up and implement.** Work phase-in-order —
  don't start a Phase 2 task while Phase 1's exit gate (the 7-day test-send window)
  is still open, and within a phase, respect the Blocked-by notes (e.g. several
  Phase 2 tasks are blocked on a human providing approver phone numbers; several
  Phase 5 tasks are blocked on a CA consultation).
- **`[human]` tasks are not yours** — they're account signups, money decisions,
  physical SIM cards, committee/governance approvals, legal consultations. Don't
  attempt them. If an `[agent]` task is blocked on one, say so and stop rather than
  working around it.
- Before starting an `[agent]` task, read its full description on ClickUp — most
  have explicit "Acceptance Criteria" and "Explicitly out of scope" sections that
  override your own judgment about scope.

**Keep ClickUp in sync as you go — this is not optional bookkeeping, it's how the
human tracks what's actually done:**

1. When you start a task, set its status to "in progress".
2. When you finish, add a comment summarizing what you built/changed (file paths,
   what's verified vs. not) and only move status further if every acceptance
   criterion is actually met, not just coded — e.g. anything needing a live
   WhatsApp pairing or real Supabase data should stay "in progress" with a comment
   noting what a human still needs to verify.
3. If you find a gap ClickUp doesn't cover (a missing task, an unclear dependency,
   something that should block a later phase), say so in a comment on the nearest
   relevant task rather than silently deciding for the team.

## Local setup

See root `README.md` for install/run/pairing instructions. `pnpm install` and any
GitHub/hosting steps need a normal, unrestricted network — this has already tripped
up sandboxed environments once (see the build-progress doc).
