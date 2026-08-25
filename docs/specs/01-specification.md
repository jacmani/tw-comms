# TWAOA FM Communication Tool — Specification

**Document 1 of 4** · Companion docs: `02-ui-design.md`, `03-build-and-test-phases.md`, `04-clickup-task-plan.md`
**Status:** Final for Phase 1 kickoff
**Supersedes:** `fm-communication-tool-architecture.md`, `fm-communication-tool-addendum.md` (both folded in below; keep for historical reference only)
**Date:** August 2026

---

## 1. Purpose & non-goals

Give the Facility Manager (FM) one tool to compose, get approved, and broadcast notices and advertisements to 814 flats across four towers — via WhatsApp and (manually, for now) MyGate — with committee approval, reusable templates, image generation, and honest analytics.

**Non-goals, stated explicitly so nobody builds toward them by accident:**
- This is not a marketing SaaS product. It's internal TWAOA infrastructure.
- It does not claim to know who *read* a WhatsApp message. See §6.
- It does not replace MyGate, email, or physical noticeboards as channels — it adds a governed WhatsApp channel and assists (not automates) MyGate.
- v1 does not include a general-purpose image editor — only templated poster generation.

---

## 2. Requirements traceability

| # | Original requirement | Where addressed |
|---|---|---|
| 1 | Send notices/updates to all 8 WhatsApp groups | §4 (send architecture) |
| 2 | Send advertisements to the 8 groups | §4, §9 (ad slots) |
| 3 | Built-in notice templates | §7 |
| 4 | Create new templates | §7 |
| 5 | Create images for notices | §8 |
| 6 | Dashboard to manage communications | `02-ui-design.md` |
| 7 | Analytics — sent/read tracking | §6 |
| 8 | Approval flow (Secretary/President/VP/Tower GC Chairs) | §5 |
| 9 | Send notices via MyGate | §4.3 |

---

## 3. System architecture

### 3.1 Where this lives

New repo `tw-comms`, same Supabase project as `tw-water-automation` — reuses the committee registry, Resend integration, auth patterns, and `html-to-image` poster pipeline already built and proven there.

```
tw-water-automation (Supabase project, shared)
├── tw-water-automation/          (existing repo)
└── tw-comms/                     (this project)
    ├── apps/
    │   ├── web/                  Next.js 14 App Router — dashboard
    │   └── whatsapp-bot/         Node/Baileys long-running process (NOT on Vercel — see 3.2)
    ├── supabase/migrations/      New tables (§4.5), namespaced, reusing committee_members
    └── packages/shared/          Design tokens, poster templates, reused from water project
```

### 3.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend/dashboard | Next.js 14 App Router | Matches `tw-water-automation` |
| Database | Supabase (Postgres), same project | Reuse committee registry, avoid duplicate auth |
| WhatsApp send | Baileys (`@whiskeysockets/baileys`) + `baileys-antiban` middleware | Only viable path into existing groups; middleware mitigates but does not eliminate ban risk (§4.2) |
| WhatsApp bot hosting | Always-on VM or Railway/Render background worker — **not Vercel** | Baileys needs a persistent WebSocket session; serverless can't hold it |
| Approval emails | Resend | Already integrated |
| WhatsApp-native approval | Same Baileys bot, private committee group | See §5.2 |
| Poster generation | `html-to-image`, existing TWAOA design tokens | Reuse water-project pipeline |
| AI drafting assist | Claude API | Optional, drafts notice copy from FM's bullet points |
| Harness/task tracking | ClickUp (this workspace) | See `04-clickup-task-plan.md` |

### 3.3 Component diagram (textual)

```
FM (phone/desktop) ──> Next.js dashboard ──> Supabase (notices, templates, approvals, sends)
                                                     │
                                    ┌────────────────┴────────────────┐
                              approved notice                   read by poller
                                    │                                  │
                          Resend (email approval)          Baileys bot (VM/Railway)
                                    │                                  │
                          President/Secretary/VP/GC          8 WhatsApp Groups
                          (click approve/reject link)         + Committee Group (approvals)
                                                               + TWAOA Announcements Channel
```

---

## 4. WhatsApp send architecture — the load-bearing decision

### 4.1 Why Baileys, not the official API

The official WhatsApp Business Cloud API cannot post into existing WhatsApp groups under any configuration — it is a 1:1/template messaging system, and even there caps broadcasts at 50 recipients pre-verification and requires opt-in. Since the entire requirement is "post into 8 groups that already exist," this path is disqualified regardless of budget. Baileys (unofficial, WebSocket-based, drives a real WhatsApp account) is the only technical path into existing groups.

### 4.2 Ban risk — assume it will happen, design for cheap recovery

This is not a hypothetical operational risk; 2026 data shows unofficial WhatsApp automation tools getting flagged at meaningfully high rates, with permanent, non-appealable bans. **Design posture: assume the bot number gets banned eventually. Optimize for a 10-minute recovery, not for prevention alone.**

Mitigations (all mandatory, not optional hardening for later):
1. **`baileys-antiban` middleware from day one** — Gaussian-jittered human-like send timing, 7-day warm-up ramp for the number, health monitoring that auto-pauses before a likely ban, rate-limited group operations.
2. **Plain Node.js runtime, not Bun** — Baileys is documented unreliable on Bun.
3. **A second, pre-warmed "spare" Association SIM**, silently added to all groups from day one, never sending — a same-day swap path if the primary is banned.
4. **A parallel "TWAOA Announcements" WhatsApp Channel** (Meta's native one-way broadcast product, not a group) as a lower-risk secondary surface — its behavioral fingerprint matches a broadcast bot far more closely than impersonating a human in a group chat, so it's less likely to trip detection, though it still relies on the same unofficial send tooling underneath.
5. **Occasional light engagement prompts** ("React 👍 if received") on notices — directly counters the 2026-era "unanswered message" detection signal without being spammy.
6. **Never treat WhatsApp as the sole channel for anything critical** — Emergency Alerts always also go to MyGate/email/committee group, so a banned bot never means a resident misses a genuine emergency.
7. **Bot health must be visibly monitored** — see §4.4.

### 4.3 MyGate (requirement #9)

MyGate's public developer portal (tech.mygate.in) exposes exactly four API categories: Express Entry, Hardware Access, Address, Prepay. No notice/communication API exists publicly.

**v1 behavior:** the composer generates MyGate-ready copy (plain text + poster image) that the FM copy-pastes into MyGate manually (~30 seconds/notice), tracked via a `mygate_posted` checkbox in the dashboard so the audit trail stays complete despite the manual step.

**Parallel-tracked, non-blocking:** email MyGate's developer contact (listed on their portal) asking about partner/API access for notice posting. Low cost to ask; plan the build assuming no or slow response. Revisit automation only if they respond positively — this must not block Phase 1–5.

### 4.4 Bot health monitoring (new — closes a gap)

A dead bot that silently fails to send notices is worse than a slow one. Required:
- Bot process reports a heartbeat to Supabase on a fixed interval (e.g., every 5 minutes)
- Dashboard shows a single traffic-light status (green: connected & heartbeat current; amber: reconnecting; red: down >15 min)
- Red status triggers a Resend email to the FM (and optionally President/Secretary) — this is the one alert in the whole system that must NOT depend on the WhatsApp channel itself, since the failure mode is "WhatsApp channel is down"
- A `bot_health_log` table (see §4.5) retains disconnect history for pattern analysis (are disconnects correlating with a particular time of day, message volume, etc.)

### 4.5 Data model

```sql
-- Templates (req #3, #4)
notice_templates (
  id, name, category,             -- 'notice' | 'advertisement' | 'emergency' | 'event'
  body_template,                  -- {tower}, {date}, {flat_count} placeholders
  default_image_template_id,      -- FK, nullable
  created_by, created_at, is_active
)

-- Composed notices
notices (
  id, template_id (nullable),
  title, body, image_url,
  category,                       -- drives approval rule, §5
  target_groups jsonb,            -- which of the 8 groups + committee group + channel
  status,                         -- draft | pending_approval | approved | sending | sent | failed | rejected
  created_by, created_at,
  mygate_posted boolean default false,
  mygate_posted_at
)

-- Approval routing & audit (req #8)
approval_rules (
  id, category, required_roles jsonb   -- data-driven, no redeploy needed to change who approves what
)

notice_approvals (
  id, notice_id, approver_id,     -- FK committee_members (existing table)
  action,                         -- approved | rejected
  channel,                        -- 'email' | 'whatsapp_group' — records which surface was used
  comment, decided_at,
  approval_link_token
)

-- Per-group send log (req #6, #7)
notice_sends (
  id, notice_id, target_type,     -- 'whatsapp_group' | 'whatsapp_channel' | 'mygate_manual'
  target_id, target_name,
  status,                         -- queued | sent | failed
  sent_at, error_message,
  reaction_count, reply_count     -- engagement proxy, §6
)

-- Advertisements & revenue (req #2, and committee reporting ask)
advertisements (
  id, notice_id (FK),
  advertiser_name, advertiser_contact,
  rate_charged, payment_status,   -- pending | paid | waived
  slot_id (FK, nullable)
)

ad_slots (
  id, week_start_date, tower_group_id,
  max_slots, slots_used, status   -- open | full | waitlist
)

-- Bot health (new, §4.4)
bot_health_log (
  id, event_type,                 -- heartbeat | disconnect | reconnect | ban_suspected
  detail, logged_at
)
```

---

## 5. Approval workflow (req #8)

### 5.1 Rules

| Category | Approval required | Rationale |
|---|---|---|
| Notice (routine) | Any one of: President, Secretary, VP, relevant Tower GC Chair | Speed, distributed authority |
| Advertisement | President or Secretary specifically | Revenue/reputational risk needs narrower authority |
| Emergency Alert | None — sends immediately | Time-critical; mandatory audit log + after-the-fact notification to all approvers |

### 5.2 Dual approval channels — email AND WhatsApp

**Primary: WhatsApp, via the private committee approval group** (the existing MC/MCGC-style group, or a dedicated new one — confirm which during Phase 1 setup). The bot posts the notice preview with Approve/Reject buttons; first qualifying tap wins; outcome posts back to the group so every committee member sees every decision as it happens (no duplicate approvals from people acting in ignorance of each other).

**Fallback/parallel: Resend email**, same signed one-click-link pattern as the water project's spike alerts. Kept running in parallel, not replaced, because (a) not everyone keeps WhatsApp notifications on, and (b) it's a channel that survives even if the bot itself is banned mid-cycle.

Both channels write to the same `notice_approvals` table; the `channel` column records which was used, so reporting can show approval-channel preference over time.

### 5.3 Flow

1. FM composes → `draft`
2. FM submits → `pending_approval`; bot posts to committee group AND Resend fires email, simultaneously
3. First qualifying approval (either channel) → `approved`, queued for send
4. Rejection → back to `draft`, approver's comment visible to FM
5. Bot sends to target groups with paced delays (§4.2), logs each to `notice_sends`

---

## 6. Analytics — what's real (req #7)

WhatsApp groups expose no per-member read receipts to any bot, official or unofficial — a platform wall, not a build gap. The dashboard must never imply "read by N residents."

| Metric | Available? | Source |
|---|---|---|
| Sent / delivered to group | ✅ | Bot send confirmation |
| Failed sends | ✅ | Bot error capture |
| Reactions | ✅ (engagement proxy) | Baileys reaction event listener |
| Replies | ✅ (engagement proxy) | Baileys message listener |
| "Read by N of 214" | ❌ Never | Not exposed by WhatsApp to anyone |
| MyGate read status | ⚠️ Only for manually-posted notices | MyGate's own in-app tracking |

---

## 7. Templates (req #3, #4)

Database-driven, not code — new template = dashboard form, not a deploy.

**Seed set for v1:** Water supply interruption, Maintenance/repair schedule, Committee meeting announcement, Event/festival announcement, Security/safety advisory, Payment/dues reminder, Vendor/service advertisement. Exact wording is a committee/FM content decision, tracked as its own task (not a technical blocker).

---

## 8. Image generation (req #5)

**v1:** FM fills a short form (headline, 1–2 detail lines, category, optional tower badge) → renders against existing TWAOA design tokens (Parchment `#F4E9CC`, Ink Green `#2F4A34`, Terracotta `#C1502E`, Marigold `#D9A441`; Fraunces + DM Sans) via `html-to-image` → PNG export. Same pipeline as the water project's infographic posters.

**v2 (post-launch, optional):** Claude Vision-assisted cleanup of vendor-supplied ad images into the branded visual system.

---

## 9. Ad slots & revenue (req #2 + committee reporting ask)

Paid ads need frequency discipline so they don't erode group signal-to-noise:

| Rule | Value |
|---|---|
| Max ads per group per week | 2 |
| Minimum gap between ads, same group | 24 hours |
| Ad blackout around emergency/major notices | No ad within 3 hours |
| Slot visibility | Dashboard shows "2/2 used this week" per group |

Monthly **Reports** screen (any committee member, read-only) shows: notices sent by category/tower, ads sent with advertiser/rate/payment status, approval turnaround time, and the honest engagement snapshot from §6. Reuses the water app's calendar-heatmap + CSV export component.

---

## 10. Dashboard (req #6)

Full UI spec in `02-ui-design.md`. Summary: this is a single-user focused workflow tool, not a generic multi-role admin panel. Compose is the home screen. Mobile-first — the FM will use this from a phone at the gate, not a desk.

---

## 11. Non-technical / human-only prerequisites

These block agent-executable tasks and must be tracked separately (see `04-clickup-task-plan.md` §"Human Prerequisites"):

- Procure Association SIM #1 (primary bot) and SIM #2 (spare) — physical SIM cards, registered WhatsApp accounts
- Add both numbers to all relevant WhatsApp groups (committee group first, for soft-launch; remaining 8 groups later)
- Create the "TWAOA Announcements" WhatsApp Channel
- Provision VM or Railway/Render account for bot hosting
- Confirm/create Supabase service role credentials for the new repo within the shared project
- Send the MyGate partner-API inquiry email
- FM/committee sign-off on seed template wording
- ClickUp API token issued for the harness (see `04-clickup-task-plan.md`)

---

## 12. Open items carried forward

- MyGate partner-access response — unknown, non-blocking
- VM vs. Railway/Render final choice — needs a quick cost/ease comparison, tracked as a Phase 1 task
- Committee approval group: reuse existing MC/MCGC group vs. create a new dedicated one — decide during Phase 1 setup, default to reuse if the group is already small/trusted enough
