# TWAOA FM Communication Tool — Original Spec Set

This is the original design/spec documentation for `tw-comms`, written before the
repo was scaffolded. It was produced across several earlier Claude sessions and had
gone missing from this Claude Project's memory — recovered from Jacob's own local
files and added here on 2026-08-25 so it lives with the code, not scattered across
chat history.

**Read the docs in this order.** Each one says at the top which others it's a
companion to; none of them duplicate each other on purpose.

| # | Doc | What it settles |
|---|---|---|
| 1 | [`01-specification.md`](./01-specification.md) | System architecture, requirements traceability, data model, WhatsApp send strategy (why Baileys), approval workflow rules, analytics honesty rules (no "read by N" claims) |
| 2 | [`02-ui-design.md`](./02-ui-design.md) | Dashboard screens, information architecture, design tokens, component reuse map from `tw-water-automation` |
| 3 | [`03-build-and-test-phases.md`](./03-build-and-test-phases.md) | Phase-by-phase build plan, testable exit criteria per phase, the soft-launch → grand-launch gate checklist |
| 4 | [`04-clickup-task-plan.md`](./04-clickup-task-plan.md) | **The original ClickUp structure and harness protocol** — folder/list layout, the `[Preconditions / Task / Acceptance Criteria / Explicitly out of scope / If blocked]` task contract, `agent`/`human` tagging, and the dependency-driven execution loop. Marked DRAFT in the original — see the note below on what actually shipped. |
| 5 | [`05-ai-infrastructure-cost-report.md`](./05-ai-infrastructure-cost-report.md) | AI drafting/image infra: paid-tier Gemini recommended over free tier specifically for data-privacy terms (free tier = your content can train Google's models) |
| 6 | [`06-infrastructure-cost-model.md`](./06-infrastructure-cost-model.md) | Full running-cost model — SIM cards, hosting, Supabase — roughly ₹550–750/month realistic ongoing cost |
| 7 | [`07-frontend-framework-decision.md`](./07-frontend-framework-decision.md) | Why the dashboard switched from Next.js (inherited default from `tw-water-automation`) to **SvelteKit** — this is the decision the live repo already follows |
| — | [`claude-code-kickoff-prompt.md`](./claude-code-kickoff-prompt.md) | The original prompt meant to be pasted into Claude Code to start the build against this spec set and the ClickUp harness protocol in doc 4 |

`historical/` holds two earlier drafts (`fm-communication-tool-architecture.md`,
`fm-communication-tool-addendum.md`) that `01-specification.md` explicitly
supersedes and folds in. Kept for the historical reasoning trail (in particular,
the addendum's fuller Baileys ban-risk research), not as an active reference.

## Where this project actually is, relative to this spec set

The repo (`apps/whatsapp-bot`, `apps/web`, `packages/shared`, `supabase/`,
`infra/`) and ClickUp board were built from a separate, later research pass
(`docs/decisions/` in this repo) before this original spec set turned back up.
The two line up on every major call that was checked — SvelteKit over Next.js,
Baileys as the send layer with the same mitigations, `bot_health_log`,
phase-by-phase build order — but there are a few real differences worth
reconciling rather than assuming they don't matter:

- **Task tagging:** doc 4 specifies `agent`/`human` as actual ClickUp tags. What's
  live uses `[agent]`/`[human]` prefixes in the task *title* instead — same intent,
  different mechanism, and only one is queryable as structured data.
- **Dependencies:** doc 4's harness protocol is built around ClickUp's native
  `waiting on` task-dependency links, so the harness can query "what's actually
  unblocked" directly. What's live uses prose "Blocked by" / "Depends on" notes in
  task descriptions instead — readable by a human or an agent reading the text, but
  not a structured link ClickUp itself can query.
- **Status flow:** doc 4 specifies `to do → in progress → blocked → review → done`,
  with a distinct `blocked` status. Current CLAUDE.md doesn't call out `blocked` as
  its own state the same explicit way.
- **814 flats / 4 towers / 8 WhatsApp groups** (Venus, Jupiter, Neptune, Mercury —
  Owners + Residents each) and the **MyGate manual-paste behavior** (§4.3 of doc 1)
  are concrete facts from this spec set that weren't yet reflected in the
  repo's README/CLAUDE.md before this doc set was recovered.

None of this blocks current work — it's a reconciliation task, not a bug. Worth a
pass to align CLAUDE.md and the live ClickUp structure to doc 4's protocol (or
consciously decide to keep the simpler version that's already running).
