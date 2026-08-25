# FM Communication Tool — Architecture & Design Report

**Project:** TWAOA Notice & Broadcast Management (Communication Tool for Facility Manager)
**Status:** Architecture complete — ready for phased build prompts
**Author context:** Jacob Mani, GC Chair Venus Tower, TWAOA
**Related:** Extends `notice-broadcast-module-report.md`; shares infrastructure with `tw-water-automation`
**Date:** August 2026

---

## 1. Purpose

Give the Facility Manager (FM) a single tool to compose, approve, and broadcast notices and advertisements to all 814 flats across Venus, Jupiter, Neptune, and Mercury towers — via their 8 existing WhatsApp groups (Owners + Residents × 4 towers) and, where feasible, MyGate — with proper committee approval, reusable templates, image generation, and honest analytics.

This is **not** a marketing tool. It's a governance-first internal comms system: every message that isn't an emergency passes through an approval gate before 814 households see it.

---

## 2. Critical technical decision: how we talk to WhatsApp groups

There are two fundamentally different ways to programmatically send WhatsApp messages, and picking the wrong one breaks requirement #1 entirely.

### 2.1 Official WhatsApp Business API (Meta / BSP-based) — REJECTED

Vendors like AiSensy, Gallabox, 360dialog sell access to Meta's official Business API. This is the right tool for business-to-customer messaging but wrong for us, for two disqualifying reasons:

- **Cannot post into existing WhatsApp groups at all.** The Business API is built for 1:1 conversations with opted-in individual contacts, not group broadcast.
- **Even for 1:1 use it caps broadcasts at 50 recipients** until Meta Business Manager verification raises the limit, requires all outbound content to use pre-approved templates, and can't message people who haven't opted in first.

Since our entire requirement is "post into 8 groups that already exist," this path is a non-starter regardless of budget.

### 2.2 Unofficial library (Baileys) as a group member — SELECTED (per existing architecture doc)

This matches what your `notice-broadcast-module-report.md` already committed to: a **dedicated Association-owned SIM**, not the FM's personal number, added as a member to all 8 WhatsApp groups, driven by an unofficial library (`@whiskeysockets/baileys`) that speaks the WhatsApp Web protocol directly over WebSocket — no browser, no official API approval needed.

This is the only path that can post into your actual groups. It comes with three constraints worth building around rather than discovering later:

1. **It's against WhatsApp's Terms of Service.** The library maintainers explicitly disclaim affiliation with WhatsApp and discourage bulk/automated usage. Practical risk is the number getting flagged or banned if it behaves like spam — sending too fast, sending identical content to many chats in immediate succession, or getting reported. Mitigation: human-like send pacing (2–5 second jitсогласованный delay between groups), never send the exact same message via any other automated channel simultaneously, and treat this as an operational risk to monitor (see §8).

2. **No group-level read receipts exist, for anyone.** WhatsApp does not expose "which of the 187 members in Venus Owners read this" to any bot, official or unofficial — this is a protocol limitation, not a library gap. In multi-device mode, only individual message-key read-state can be marked, and only for the bot's own inbound messages, not broadcast reach into a group. **Decision (confirmed with Mani): analytics will show sent/delivered status plus reaction and reply counts as engagement proxies — not fabricated "read by X residents" numbers.**

3. **Session fragility.** The bot is a logged-in WhatsApp Web session tied to the SIM; disconnects happen and must trigger automatic reconnection with backoff, plus an alert to the FM/admin if the session stays down (a dead bot silently failing to send notices is a worse failure than a slow one).

### 2.3 MyGate (requirement #9)

MyGate's public developer portal (tech.mygate.in) lists exactly four API categories: Express Entry, Hardware Access, Address, and Prepay (utility). **No notice, communication, or broadcast API exists in their public developer surface.** This is consistent with MyGate's product shape — they're a closed ERP that sells *to* societies, not a platform others integrate content into.

**Decision:** email MyGate's developer contact to ask about partner/API access for notice posting — low cost, worth trying — but build v1 assuming the answer is no or slow. **v1 behavior:** the composer generates MyGate-ready copy (plain text formatted for their notice field, plus the poster image) that the FM copy-pastes into the MyGate app manually, ~30 seconds of work per notice. This is tracked as a manual step in the dashboard (mark-as-posted-to-MyGate checkbox) so the audit trail stays complete even though the send itself isn't automated. Revisit automation if MyGate responds.

---

## 3. System architecture

### 3.1 Where this lives

**Decision (confirmed with Mani): new repo, same Supabase project as `tw-water-automation`.**

Rationale: the committee registry (24 members, tower-scoped, 2026–27 term), Resend email integration, auth patterns, and `html-to-image` poster pipeline are already built and working there. Duplicating them in a separate project would mean maintaining two committee rosters and two email senders for what is, from a resident's perspective, one TWAOA system. At 814 flats' worth of data, there's no scale reason to separate them — Supabase connection pooling handles both workloads without contention.

```
tw-water-automation (Supabase project, shared)
├── tw-water-automation/          (existing repo — meter readings, alerts)
└── tw-comms/                     (NEW repo — this project)
    ├── apps/
    │   ├── web/                  Next.js 14 App Router — FM dashboard + approver views
    │   └── whatsapp-bot/         Node/Baileys long-running process (separate deploy target — see §3.3)
    ├── supabase/
    │   └── migrations/           New tables, namespaced (see §4), reusing existing committee_members table
    └── packages/
        └── shared/               Design tokens, poster templates — reused from water project
```

### 3.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend/dashboard | Next.js 14 App Router | Matches `tw-water-automation`; Vercel auto-deploy already proven |
| Database | Supabase (Postgres), same project | Reuse committee registry, avoid duplicate auth |
| WhatsApp send | Baileys (`@whiskeysockets/baileys`) | Only viable path into existing groups (§2.2) |
| WhatsApp bot hosting | **Not Vercel** — see §3.3 | Baileys needs a persistent long-running process; serverless functions can't hold a WebSocket session |
| Approval emails | Resend | Already integrated; same signed one-click link pattern as water alerts |
| Poster generation | `html-to-image`, same design tokens | Reuse Parchment/Ink-Green/Terracotta/Marigold + Fraunces/DM Sans system from water project and Ponnonam site |
| AI drafting assist | Claude API | Draft notice copy from FM's rough bullet points; optional, not required for MVP send path |

### 3.3 Why the WhatsApp bot can't live on Vercel

This is the one deployment wrinkle worth flagging early. Vercel serverless functions are stateless and short-lived; Baileys needs to hold an authenticated WebSocket connection to WhatsApp Web continuously, 24/7. Options, cheapest first:

1. **A small always-on VM** (e.g., a ₹300–500/month Indian-region VPS, or a free-tier Oracle/AWS instance) running the bot as a Node process under `pm2` or similar, with the Baileys auth state persisted to disk and backed up.
2. **Railway/Render** background worker (their free/hobby tiers support long-running processes) — simplest to wire up if you want to avoid raw VM management.

The bot process talks to the *same* Supabase project as the dashboard (send queue table, poll for pending approved notices, push status back). It does not need to be co-located with the Next.js app.

---

## 4. Data model (new tables, `tw-comms` namespace)

```sql
-- Templates (requirement #3, #4)
notice_templates (
  id, name, category,            -- 'notice' | 'advertisement' | 'emergency' | 'event'
  body_template,                 -- text with {tower}, {date}, {flat_count} etc. placeholders
  default_image_template_id,     -- FK to poster templates, nullable
  created_by, created_at, is_active
)

-- Individual composed notices
notices (
  id, template_id (nullable, freeform allowed),
  title, body, image_url,
  category,                      -- drives approval rule (see §5)
  target_groups jsonb,           -- which of the 8 groups (default: all)
  status,                        -- draft | pending_approval | approved | sending | sent | failed
  created_by, created_at,
  mygate_posted boolean default false,  -- manual-tracking checkbox, §2.3
  mygate_posted_at
)

-- Approval routing & audit (requirement #8)
notice_approvals (
  id, notice_id, approver_id,    -- FK committee_members (existing table, reused)
  action,                        -- approved | rejected
  comment, decided_at,
  approval_link_token            -- Resend signed one-click token, same pattern as water alerts
)

-- Per-group send log (requirement #6, #7)
notice_sends (
  id, notice_id, whatsapp_group_id, group_name,
  status,                        -- queued | sent | failed
  sent_at, error_message,
  reaction_count, reply_count    -- populated by bot listening post-send, engagement proxy
)
```

Approval rules are data (a small `approval_rules` table keyed by category → required approver roles), not hardcoded logic, so changing who can approve what doesn't require a code deploy — relevant since committee composition changes annually per your own noted principle.

---

## 5. Approval workflow (requirement #8)

| Category | Approval required | Rationale |
|---|---|---|
| **Notice** (routine — maintenance, events, schedule changes) | Any **one** of: President, Secretary, VP, or the relevant Tower's GC Chair | Low risk, needs speed, distributed authority |
| **Advertisement** | President **or** Secretary specifically | Revenue/reputational risk, external party involved — narrower authority |
| **Emergency Alert** | **No approval — sends immediately** | Time-critical (water outage, security, fire); mandatory audit log entry + automatic notification to all approvers *after* the fact so nobody is blindsided |

Flow for non-emergency notices:
1. FM composes (from template or freeform) → status `draft`
2. FM submits → status `pending_approval`, Resend email fires to the eligible approver pool with a signed one-click approve/reject link (same UX pattern as your water spike alerts)
3. First qualifying approval flips status to `approved` and queues it for send; a rejection returns it to `draft` with the approver's comment visible to FM
4. Bot picks up `approved` notices, sends to target groups with paced delays, logs each group's result to `notice_sends`

This mirrors the "approval routes to a pool via signed links, Emergency bypasses with mandatory logging" design already locked in your `notice-broadcast-module-report.md` — this spec just extends it with the advertisement-specific tightening (President/Secretary only) since ads carry different risk than routine notices.

---

## 6. Templates (requirements #3 & #4)

Templates are database rows, not code — creating a new one is a dashboard form, not a deploy:

- **Fields:** name, category, body with `{placeholder}` variables (tower name, date, flat count, FM contact), optional default poster layout
- **Seed set for v1** (built from common TWAOA notice types): Water supply interruption, Maintenance/repair schedule, Committee meeting announcement, Event/festival announcement (reusing Ponnonam-style patterns), Security/safety advisory, Payment/dues reminder, Vendor/service advertisement
- FM picks a template → placeholders pre-fill from known context (tower, today's date) → edits the rest → submits

---

## 7. Image generation (requirement #5)

Rather than building a general-purpose design tool, this reuses proven infrastructure at low marginal cost:

- **v1 — templated poster generator:** FM fills a short form (headline, 1–2 detail lines, category, optional tower-specific badge) → renders against an HTML/CSS template using the existing TWAOA design tokens (Parchment `#F4E9CC`, Ink Green `#2F4A34`, Terracotta `#C1502E`, Marigold `#D9A441`; Fraunces + DM Sans) → `html-to-image` exports a PNG, same pipeline already proven for the water project's infographic posters.
- **v2 (optional, later):** Claude Vision-assisted "clean up this rough flyer/photo into a branded TWAOA notice" for cases where FM has a vendor-supplied ad image that needs reformatting to fit the visual system.

No need for a from-scratch canvas editor — the template-driven approach fits the "mixed-age, no gimmicks" design principle already established for resident-facing tools.

---

## 8. Dashboard (requirement #6) & Analytics (requirement #7)

**Dashboard views:**
- **Compose** — template picker or freeform, image attach/generate, target group selection (default all 8, can narrow to specific towers)
- **Approval queue** — for President/Secretary/VP/GC Chairs: pending items awaiting their decision, with one-tap approve/reject (also reachable via the emailed link without logging in)
- **Send history** — reverse-chron list of all notices with status, per-group send result, and honest engagement numbers
- **Templates** — library view, create/edit
- **Bot health** — is the WhatsApp session connected right now (critical operational visibility per §2.2's session-fragility risk)

**Analytics — what's real vs. what's not:**

| Metric | Available? | Source |
|---|---|---|
| Sent / delivered to group | ✅ Yes | Bot send confirmation, no error |
| Failed sends (bot disconnected, group removed us, etc.) | ✅ Yes | Bot error capture |
| Reactions on the message | ✅ Yes (proxy for engagement) | Baileys listens for reaction events on sent messages |
| Replies in-thread | ✅ Yes (proxy for engagement) | Baileys listens for replies referencing the sent message |
| "Read by N of 214 residents" | ❌ **Never available** | Not exposed by WhatsApp to any bot, official or unofficial — this is a platform wall, not a build gap |
| MyGate in-app read status | ⚠️ Only for notices actually posted to MyGate | MyGate's own in-app read tracking (if FM manually posts there per §2.3) |

This distinction is stated plainly in the dashboard UI itself (e.g., "Engagement: 12 reactions, 4 replies" rather than any implied read-count), so nobody — FM, President, or an auditing resident — is misled about what the numbers mean.

---

## 9. Build phases

Given the scope, this splits into independently shippable phases rather than one build:

1. **Phase 1 — Core send pipeline:** Baileys bot setup on chosen host, connects to all 8 groups, basic compose-and-send (no approval gate yet, manual trigger only) — proves the hardest technical risk (group posting, session stability) first.
2. **Phase 2 — Approval workflow:** approval rules table, Resend integration, approval queue UI, status flow draft→pending→approved→sent.
3. **Phase 3 — Templates & dashboard polish:** template CRUD, send history, bot health view.
4. **Phase 4 — Image generation:** poster template + `html-to-image` pipeline reuse.
5. **Phase 5 — Analytics:** reaction/reply capture, engagement display.
6. **MyGate:** parallel-tracked, not blocking — starts with the partner-access email; ships as manual-copy UI regardless of the outcome.

Recommend starting with **Phase 1**, since it validates the one assumption everything else depends on: that the Association SIM can sit in all 8 groups and post reliably without getting flagged. Everything downstream (approval, templates, analytics) is comparatively low-risk engineering once that's proven.

---

## 10. Open items

- MyGate partner/API inquiry — email to send, response unknown
- Choice of always-on host for the Baileys bot (VM vs. Railway/Render) — needs a quick cost/ease comparison before Phase 1 starts
- Seed template content (exact wording for the 7 v1 templates) — needs FM/committee input, not a technical decision
