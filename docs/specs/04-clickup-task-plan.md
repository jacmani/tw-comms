# TWAOA FM Communication Tool — ClickUp Task Plan (DRAFT — for review before live creation)

**Document 4 of 4** · Companion docs: `01-specification.md`, `02-ui-design.md`, `03-build-and-test-phases.md`
**Status:** DRAFT — review before I create anything live in ClickUp
**Date:** August 2026

---

## 1. Structure

**New folder:** `📲 TW Comms` in the same "Team Space" as `💧 TW Water Automation`, alongside it (not nested inside it — separate repo, separate folder, matching your existing convention of one folder per project).

**Departure from the Water Automation folder's flat-list pattern (per your instruction):** instead of purely functional lists with flat, unordered tasks, this folder uses **ClickUp task dependencies** (`waiting on` / `blocking`) so the harness can query "what's actually unblocked right now" rather than a human needing to sequence it manually. Lists still group by phase/function for human readability, but the dependency graph — not list order — is what governs execution order.

**Lists (one per phase, matching `03-build-and-test-phases.md` exactly, so the two documents never drift apart):**

```
📲 TW Comms (folder)
├── 🔲 Phase 0 — Human Prerequisites
├── 🧵 Phase 1 — Core Send Pipeline & Bot Resilience
├── ✅ Phase 2 — Approval Workflow
├── 🖥️ Phase 3 — Dashboard (Compose, Templates, History)
├── 🎨 Phase 4 — Image Generation
├── 📊 Phase 5 — Analytics, Reports, Ad Slots, Revenue
├── 🚀 Rollout & Launch Gate
└── 🐛 Bugs & Findings          (catch-all, mirrors "Critical Fixes" pattern from Water Automation)
```

---

## 2. Task contract (every agent-executable task follows this template)

This is the piece that makes the difference between "a to-do list" and "something Claude Code can execute unattended." Every task description will follow this exact structure:

```markdown
## Preconditions
- [What must already exist/be true — e.g., "Phase 0 complete", "notice_templates table exists"]

## Task
[One clear sentence — what to build/change]

## Acceptance Criteria
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]
[Never "works well" or "looks good" — always a condition that can be checked]

## Explicitly out of scope for this task
- [What NOT to touch — enforces "no restructuring without flagging"]

## Files/paths expected to change
- [Best-guess file list — not binding, but sets expectations]

## If blocked or ambiguous
Do not guess. Add a comment to this task explaining what's unclear, set status to
"blocked", and stop. Do not proceed on an assumption.
```

Human-only tasks (Phase 0, content decisions, SIM procurement) skip the "Files/paths" field but keep the same Preconditions/Acceptance Criteria structure — the harness needs to recognize these as non-agent tasks regardless (see §4).

---

## 3. Dependency model

ClickUp's native task-relationship feature (`waiting on`) will be used to encode the phase order and, within phases, the specific technical dependencies called out in the spec — for example:

- All Phase 1 tasks → `waiting on` → Phase 0 completion
- "Approval queue UI" (Phase 3) → `waiting on` → "`approval_rules` table migration" (Phase 2)
- "Poster generator sub-flow" (Phase 4) → `waiting on` → "Compose screen base flow" (Phase 3)
- "Ad slot enforcement" (Phase 5) → `waiting on` → "`ad_slots` table migration" (Phase 5, earlier task)

This means the harness's query pattern is always: *"give me tasks with status `to do` where all `waiting on` links are `done`"* — never "give me the next task in list order." This directly supports the "Claude Code could pick tasks & complete it one after the other" goal without a human manually sequencing each handoff.

---

## 4. Task types & status flow

**Task type tag** (ClickUp tag, not custom field, for simplicity): `agent` or `human`. The harness only pulls `agent`-tagged tasks; `human` tasks (SIM procurement, content sign-off, go/no-go gate confirmations) are surfaced to Mani separately and never attempted by Claude Code.

**Status flow (same base statuses as Water Automation, extended):**

```
to do → in progress → blocked → review → done
                ↑___________↓
              (blocked tasks return to in progress once unblocked)
```

- `to do`: unblocked, not yet started
- `in progress`: harness/Claude Code actively working it
- `blocked`: agent hit an ambiguity or missing precondition — **requires a human comment before it can move**, per the task contract's "if blocked" clause
- `review`: agent believes acceptance criteria are met, awaiting human (Mani) or automated-test confirmation — nothing self-certifies to `done` (per Build Phases doc §10)
- `done`: confirmed complete

---

## 5. Harness protocol (the missing piece — how the harness itself should behave)

This is written as instructions *for the harness*, and should be pinned as a ClickUp Doc attached to the folder, not buried in a task description:

1. Query `agent`-tagged tasks in status `to do` with all dependencies `done`.
2. Pick the task with the fewest unresolved dependents (i.e., prefer tasks that unblock the most other work) — if ClickUp's data doesn't make this easy to compute, fall back to phase order.
3. Move to `in progress` before starting work.
4. Follow the task's Preconditions and Acceptance Criteria exactly. If either is unclear or contradicted by what's actually in the repo, **stop, comment, set to `blocked`** — do not silently reinterpret.
5. On completion, move to `review` with a comment summarizing what was done and explicitly listing which acceptance criteria are met — do not move directly to `done`.
6. Never modify a task's Preconditions or Acceptance Criteria to make it easier to complete — if they seem wrong, that's a `blocked` situation, flagged for a human, not a task to silently edit.
7. Respect the `Explicitly out of scope` field as a hard boundary, mirroring the existing "no restructuring without flagging" principle.

---

## 6. Draft task list by phase

*(Titles and one-line summaries only here for review — full task-contract bodies get written when created live in ClickUp.)*

### Phase 0 — Human Prerequisites (all tagged `human`)
1. Procure primary Association SIM, WhatsApp-register it
2. Procure spare Association SIM, WhatsApp-register it
3. Add primary SIM to committee approval WhatsApp group
4. Provision VM or Railway/Render account for bot hosting
5. Issue Supabase service role credentials for `tw-comms`
6. Issue ClickUp API token for harness
7. Send MyGate partner-API inquiry email
8. Confirm which existing group (MC/MCGC) is used for committee approvals

### Phase 1 — Core Send Pipeline & Bot Resilience (mix of `agent`/`human`)
1. `[agent]` Scaffold `tw-comms` repo structure per spec §3.1
2. `[agent]` Baileys bot base connection + auth state persistence
3. `[agent]` Integrate `baileys-antiban` middleware
4. `[agent]` Reconnection logic with exponential backoff
5. `[agent]` Bot heartbeat → `bot_health_log` table + migration
6. `[human]` Add spare SIM to committee group (silent)
7. `[human]` Create "TWAOA Announcements" WhatsApp Channel
8. `[agent]` Bot can post to the Channel
9. `[human]` Run and confirm 7-day test-send window (Phase 1 exit criteria)

### Phase 2 — Approval Workflow (`agent`, depends on Phase 1 done)
1. `[agent]` `approval_rules` + `notice_approvals` migrations
2. `[agent]` Resend email approval flow (adapt water-project pattern)
3. `[agent]` WhatsApp button-based approval (bot posts, captures tap)
4. `[agent]` Status flow state machine (draft→pending→approved/rejected→sending→sent/failed)
5. `[agent]` Emergency Alert bypass path + audit logging
6. `[agent]` Race-condition handling for near-simultaneous approvals

### Phase 3 — Dashboard (`agent`, depends on Phase 2 done)
1. `[agent]` Next.js scaffold, design tokens import from shared package
2. `[agent]` Compose screen — full 5-step flow
3. `[agent]` Templates screen — CRUD
4. `[human]` Seed template content sign-off (7 templates)
5. `[agent]` Load seed templates (depends on #4)
6. `[agent]` History screen (reuse water-app components)
7. `[agent]` Bot Status screen
8. `[agent]` Mobile responsive pass
9. `[human]` FM UAT pass, capture friction as new tasks

### Phase 4 — Image Generation (`agent`, depends on Phase 3 Compose screen done)
1. `[agent]` Poster generator form + live preview
2. `[agent]` `html-to-image` pipeline adaptation
3. `[agent]` Attach generated image back into compose flow
4. `[human]` Verify real-send image rendering (not just preview)

### Phase 5 — Analytics, Reports, Ad Slots, Revenue (`agent`, depends on Phase 2 + Phase 3 done)
1. `[agent]` Reaction/reply event listeners
2. `[agent]` `advertisements` + `ad_slots` migrations
3. `[agent]` Reports screen
4. `[agent]` Ad slot enforcement in compose flow
5. `[agent]` UI audit — confirm no screen implies "read by N" (explicit checklist task)

### Rollout & Launch Gate (`human`, depends on Phase 5 done)
1. Add bot to Venus Owners group, 7-day monitor
2. Add remaining 3 towers' Owners groups, 7-day monitor
3. Add all 4 Residents groups, 7-day monitor
4. Run full soft-launch → grand-launch gate checklist (spec doc §9, all 8 criteria)
5. Grand launch announcement + FM reference card
6. Post-launch 2-week daily monitoring window

### Bugs & Findings (catch-all, populated as issues surface — no seed tasks)

---

## 7. What I need from you before creating this live

1. **Confirm the folder/list naming** above, or adjust
2. **Confirm task-type tagging approach** (`agent`/`human` tags) is workable for how you'll point Claude Code at ClickUp
3. **Confirm dependency-heavy structure** is what you want operationalized, or if a simpler subset is preferable for the first pass (we can always add more dependency links later)
4. Once confirmed, I'll create the folder, lists, and full task set (with complete task-contract bodies, not just titles) live in ClickUp, and link dependencies as specified in §3
