# TWAOA FM Communication Tool — Build Phases & Testing Phases

**Document 3 of 4** · Companion docs: `01-specification.md`, `02-ui-design.md`, `04-clickup-task-plan.md`
**Date:** August 2026

---

## 1. Phasing philosophy

Each phase is independently shippable and testable. The riskiest, least-reversible assumption (Baileys can reliably post into groups without immediate bans) is validated first, in Phase 1, before any dependent feature work happens. Nothing in Phase 2+ should require re-architecting Phase 1.

Every phase has: **build tasks**, **exit criteria** (testable, not vibes), and **a testing pass** before the next phase starts. This mirrors your own established principle — audit before implementation, stop-and-report over silent decisions.

---

## 2. Phase 0 — Human prerequisites (blocks everything)

Not a build phase; a checklist. Nothing in Phase 1 can start until these are done. Full list lives in `01-specification.md` §11 and is tracked as its own ClickUp list (see `04-clickup-task-plan.md`).

**Exit criteria:**
- [ ] Primary Association SIM procured, WhatsApp-registered, added to the committee approval group
- [ ] Spare Association SIM procured, WhatsApp-registered (not yet added to any group — added in Phase 1)
- [ ] VM or Railway/Render account provisioned for bot hosting
- [ ] Supabase service role credentials issued for `tw-comms` within the shared project
- [ ] ClickUp API token issued for the harness

---

## 3. Phase 1 — Core send pipeline + bot resilience

**Goal:** Prove the bot can reliably post into a WhatsApp group and survive disconnects, before building anything that depends on it.

**Build tasks:**
- Baileys bot process, `baileys-antiban` middleware wired in from the start (not retrofitted)
- Bot connects to the committee approval group only (soft-launch scope — confirmed: reuse existing MC/MCGC-style group)
- Basic manual-trigger send (no approval gate yet) — a script/minimal endpoint the developer can call directly, not yet exposed to the FM
- Reconnection logic with exponential backoff
- Bot heartbeat → `bot_health_log` table (§4.4 of spec)
- Spare SIM added to the same group, silent (never sends)
- "TWAOA Announcements" Channel created, bot can post to it

**Exit criteria (testable):**
- [ ] Bot successfully sends 20+ test messages to the committee group across a 7-day period with zero manual intervention
- [ ] At least one forced disconnect (e.g., kill the process) recovers automatically within 5 minutes
- [ ] Heartbeat visible in `bot_health_log` at expected intervals throughout the test period
- [ ] Zero ban/restriction on the primary number after the 7-day test window
- [ ] Spare SIM confirmed present in the group and ready (manual send test once, then left idle)

**Testing pass:** Run this as an actual soft-soft-launch — real (low-stakes) test messages to the committee group, not synthetic pings, since committee members seeing "test message, please ignore" a few times is exactly the right way to validate this before residents are involved.

---

## 4. Phase 2 — Approval workflow

**Goal:** Notices can't reach any group without going through the rules in spec §5.

**Build tasks:**
- `approval_rules`, `notice_approvals` tables
- Resend email approval flow (signed one-click links, adapted from water project pattern)
- WhatsApp-native approval: bot posts notice preview + Approve/Reject buttons to committee group, captures button-tap response
- Status flow: draft → pending_approval → approved/rejected → sending → sent/failed
- Emergency Alert bypass path (no approval, immediate send, mandatory audit log + after-the-fact notification)

**Exit criteria:**
- [ ] A test notice submitted by the developer routes correctly to the right approver pool based on category
- [ ] Approval via WhatsApp button tap correctly updates status and triggers send
- [ ] Approval via email link correctly updates status and triggers send
- [ ] Rejection via either channel returns the notice to draft with the comment visible
- [ ] Emergency Alert test bypasses approval and sends immediately, with audit log entry and after-the-fact notification confirmed
- [ ] No duplicate sends when two approvers act near-simultaneously (race condition test)

---

## 5. Phase 3 — Dashboard: Compose, Templates, History

**Goal:** The FM can actually use this without a developer in the loop.

**Build tasks:**
- Next.js dashboard: Compose screen (full flow per `02-ui-design.md` §3.2), Templates screen, History screen
- 7 seed templates loaded (content confirmed by FM/committee — tracked as a separate content task, not a code task)
- Bot Status screen (traffic light, per UI doc §3.7)
- Mobile responsive pass

**Exit criteria:**
- [ ] FM can compose, submit, and see a real notice through to "sent" status without any developer intervention
- [ ] All 5 compose-flow steps work correctly on a phone screen (manual test on an actual phone, not just browser resize)
- [ ] Templates CRUD works end-to-end
- [ ] Bot Status screen correctly reflects live bot state (verified by manually killing/restarting the bot process during testing)

**Testing pass:** Hand the dashboard to the FM directly for this phase's UAT — this is the first point a non-technical user drives it. Capture friction points as new tasks, don't silently "fix" the spec without flagging (per your stop-and-report principle).

---

## 6. Phase 4 — Image generation

**Build tasks:**
- Poster generator sub-flow (per UI doc §3.3), `html-to-image` pipeline adapted from water project
- Template-linked default images

**Exit criteria:**
- [ ] FM can generate a poster from the form, see a live preview, and have it attach correctly to a notice
- [ ] Generated posters render correctly when actually sent to WhatsApp (image doesn't get compressed/cropped unexpectedly — verify on a real send)

---

## 7. Phase 5 — Analytics, Reports, Ad Slots, Revenue

**Build tasks:**
- Reaction/reply capture (Baileys event listeners)
- History screen engagement display
- `advertisements`, `ad_slots` tables + Reports screen (per UI doc §3.6)
- Ad slot enforcement in the compose flow (blocks/warns when a group's weekly slot is full)

**Exit criteria:**
- [ ] Reactions and replies on a real test send are correctly captured and displayed
- [ ] Reports screen shows accurate counts for a test month of data
- [ ] Ad slot limit correctly blocks/warns when full, and correctly resets on the new week boundary
- [ ] No screen anywhere implies a "read by N" number — explicit UI audit against spec §6

---

## 8. Full-group rollout (scope expansion, not a new phase)

Once Phases 1–5 pass on the committee group, expand target groups incrementally rather than all-at-once:

1. Add bot to **one tower's Owners group** (recommend Venus, since Mani has the most direct oversight there) — run for 7 days, monitor bot health and reactions
2. Add remaining **3 towers' Owners groups** — run for 7 days
3. Add all **4 Residents groups** — run for 7 days
4. Full 8-group + committee group + Channel live

Each step is a go/no-go gate on the same bot-health criteria as Phase 1 (no bans, reconnects recover automatically, heartbeat consistent) — don't advance to the next tower/group set if the current one shows instability.

---

## 9. Soft-launch → Grand-launch gate

This is a literal checklist, not a subjective call, run after full-group rollout step 4 above has been live for at least 2 weeks:

**Go criteria (all required):**
- [ ] Zero bans or account restrictions across the full rollout period
- [ ] Bot uptime ≥95% over the 2-week window (measured from `bot_health_log`)
- [ ] At least one real approval cycle completed via each channel (WhatsApp button AND email link)
- [ ] At least one real Emergency Alert sent and confirmed correctly bypassing approval
- [ ] FM has independently composed and sent at least 5 real notices without developer assistance
- [ ] At least one real advertisement sent and correctly tracked in Reports/Revenue
- [ ] Spare SIM swap procedure tested at least once (even as a drill, not a real ban) — confirms recovery path actually works, not just documented
- [ ] Committee has reviewed the Reports screen at least once and confirmed the numbers make sense to them (a sanity check against silent bugs a developer wouldn't catch)

**If any criterion fails:** extend soft-launch, do not proceed to grand-launch on partial criteria. Document which criterion failed and why as a ClickUp task, not just a conversation.

**Grand launch activities** (once gate passes):
- Formal committee announcement across all channels (this notice itself is a good first real "grand launch" test of the system, sent through itself)
- FM given a short reference card (one page) covering: how to compose, what the bot-status colors mean, who to contact if something looks wrong
- Post-launch monitoring window (2 weeks) with daily bot-health spot checks before returning to normal-cadence monitoring

---

## 10. Testing approach across all phases

- **No phase's exit criteria are self-certified by Claude Code.** Each exit criterion needs either a human (Mani) confirmation or an automated test result visible in ClickUp (see harness protocol in `04-clickup-task-plan.md`) — an agent marking its own work "done" without evidence is not sufficient given the stakes (814 households, governance requirements).
- **Real test sends, not synthetic ones, wherever possible** — the committee group soft-launch approach means test messages are seen by real people from the start, which surfaces UX/tone issues synthetic testing wouldn't catch.
- **Ban-risk testing is inherently probabilistic** — a clean Phase 1 test window reduces confidence in a ban, it doesn't eliminate the risk. This is reflected in the ongoing bot-health monitoring requirement continuing indefinitely post-launch, not just during test phases.
