# Claude Code Kickoff Prompt — TWAOA FM Communication Tool (tw-comms)

Paste this as your opening prompt to Claude Code (terminal, VS Code, or desktop app) to start the build.

---

## Prompt to paste

```
You are building tw-comms, a WhatsApp/MyGate notice-broadcast system for TWAOA
(Trinity World Apartment Owners Association). Read these documents in full before
writing any code — they are the authoritative spec, not background reading:

1. 01-specification.md       — system architecture, data model, requirements
2. 02-ui-design.md            — dashboard screens and IA
3. 03-build-and-test-phases.md — phase plan, exit criteria, launch gate
4. 05-ai-infrastructure-cost-report.md — Gemini paid-tier setup, few-shot drafting
5. 06-infrastructure-cost-model.md — hosting/SIM/Supabase cost constraints
6. 07-frontend-framework-decision.md — SvelteKit chosen over Next.js, read this
   before scaffolding the web app

Your task source is ClickUp, not this prompt. Folder: "📲 TW Comms" in the TWAOA
workspace. Connect via the ClickUp MCP/API and orient yourself:

- Get the folder hierarchy and list all 8 lists (Phase 0 through Rollout & Launch
  Gate, plus Bugs & Findings).
- Every agent-executable task is prefixed [agent] in its title; every human-only
  task is prefixed [human]. Only ever work [agent] tasks. Never attempt a [human]
  task — if you think one is blocking you, say so and stop, don't work around it.
- Task descriptions follow a fixed contract: Preconditions, Task, Acceptance
  Criteria, Explicitly out of scope, If blocked or ambiguous. Follow this contract
  exactly for every task you touch.

HARNESS PROTOCOL — follow this loop:

1. Query [agent]-tagged tasks in status "to do" whose dependencies (the "waiting
   on" links in ClickUp) are all in status "done". Some Phase 1 dependencies are
   already linked; later phases may not be fully linked yet — if a task's stated
   Preconditions reference something that isn't reflected as a ClickUp dependency,
   trust the Preconditions text and verify manually rather than skipping the check.
2. Before starting a [human] task's dependents, confirm in ClickUp that the
   [human] task is actually marked done — do not assume it's done just because
   time has passed.
3. Move the task to "in progress" before starting.
4. Do exactly what the task's Acceptance Criteria describe — nothing more,
   nothing less. Respect "Explicitly out of scope" as a hard boundary. If you
   think the spec is wrong or something is unclear, that is a "blocked"
   situation — comment on the task explaining what's unclear and set status to
   "blocked". Do not guess, do not silently reinterpret, do not restructure
   anything not explicitly in scope for the task.
5. When you believe the acceptance criteria are met, move the task to "review"
   with a comment listing which criteria are satisfied and how you verified
   each one. Never move a task directly to "done" yourself — that requires
   human confirmation per 03-build-and-test-phases.md §10.
6. Move to the next unblocked task and repeat.

START HERE:; Phase 0 (Human Prerequisites) is being handled by Mani in parallel —
check its tasks' status in ClickUp before assuming any are done. Begin working
Phase 1 (Core Send Pipeline & Bot Resilience) tasks whose preconditions are
already satisfied; for any Phase 1 task blocked on a Phase 0 item, skip it and
move to the next unblocked one rather than waiting idle.

Do not proceed past the Phase 1 exit gate (the "[human] Run and confirm 7-day
test-send window" task) under any circumstances — that task is explicitly
[human] and requires Mani to run a real multi-day test before Phase 2 starts.
If you finish all currently-unblocked Phase 1 [agent] tasks, stop and report
what's done and what's waiting on the human prerequisites — do not start Phase 2
work early just because code you could write.

Ask me now: do you have ClickUp MCP access configured, and do you have the
Supabase and bot-hosting credentials needed for the first scaffolding task, or
should I check task status first and report what's actually startable right now?
```

---

## Why this prompt is shaped this way

- **It points Claude Code at ClickUp as the source of truth**, not at a copy-pasted task list — so the harness protocol from doc 04 (query unblocked tasks, respect the task contract, never self-certify "done") actually governs execution, matching the design.
- **It explicitly forbids working ahead past the Phase 1 exit gate** — this is the one place in the whole plan where a human decision (a real 7-day live test) is load-bearing, and an agent that "helpfully" starts Phase 2 code before that gate passes would undermine the entire soft-launch safety design.
- **It tells Claude Code to check reality rather than assume** — Phase 0 items are being done by you in parallel with this kickoff, and the prompt makes checking actual ClickUp status a first step rather than trusting elapsed time.
- **It ends by asking a clarifying question rather than guessing at credentials/access** — appropriate here since missing credentials would otherwise cause silent failures partway into a task rather than a clean stop at the start.

## Before you run this

Two things worth confirming on your end first:
1. **Claude Code needs ClickUp MCP access configured** in whatever environment you're running it (terminal/VS Code/desktop) — same connector, different context than this chat.
2. **Phase 0's credential-issuing tasks should be at least started** (Supabase service role, bot hosting) before Claude Code can get past the repo-scaffolding task — worth doing those two first if you want Claude Code to have real work available immediately rather than reporting "everything's blocked" on its first pass.
