# TWAOA FM Communication Tool — UI Design Document

**Document 2 of 4** · Companion docs: `01-specification.md`, `03-build-and-test-phases.md`, `04-clickup-task-plan.md`
**Audience:** Claude Code (build reference), FM (review before build)
**Date:** August 2026

---

## 1. Design principles

1. **One user, one job, repeated often.** The FM composes, checks approval status, and monitors bot health — that's ~90% of actual usage. This is not a multi-role SaaS admin panel; it's a focused workflow tool.
2. **Mobile-first, not mobile-responsive-as-afterthought.** The FM will very plausibly compose or check status standing at the gate or mid walk-through. Every screen must work one-handed on a phone before it needs to look good on a desktop monitor.
3. **Reuse, don't reinvent.** Design tokens, calendar-heatmap component, and CSV export are already built and proven in `tw-water-automation`. Pull them in, don't rebuild.
4. **Never imply false precision.** Per §6 of the spec, analytics language must say "reactions" and "replies," never "read by."
5. **Mixed-age, elderly-inclusive readability** — this governs committee-facing screens too, not just resident-facing ones. Large tap targets, high contrast, no gimmicky motion.

### 1.1 Design tokens (reused, not reinvented)

| Token | Value |
|---|---|
| Parchment | `#F4E9CC` |
| Ink Green | `#2F4A34` |
| Terracotta | `#C1502E` |
| Marigold | `#D9A441` |
| Display font | Fraunces |
| Body font | DM Sans |
| Spacing grid | 8pt |

Status colors (new, additive — not replacing the palette above, used only for status chips/badges):
- Draft: neutral gray
- Pending approval: Marigold
- Approved / Sent: Ink Green
- Failed / Rejected: Terracotta
- Bot health green/amber/red: standard traffic-light semantics, kept separate from the brand palette since it's a system-status signal, not brand content

---

## 2. Information architecture

```
Compose (home)
├── New Notice
├── New Advertisement
├── Drafts
└── Awaiting Approval (FM's own open loops)

Top nav (slim, not a heavy sidebar — few destinations):
├── Compose         (home)
├── Templates
├── History
├── Reports
└── Bot Status

Committee-facing (reached via WhatsApp link or dashboard login, read-only except approval actions):
├── Approval Queue   (President/Secretary/VP/GC Chairs only)
└── Reports          (read-only, any committee member)
```

No deep hierarchy, no dashboard-of-widgets home screen. The FM's open loops (drafts, pending approvals) surface directly on the home screen because that's what they open the app to check.

---

## 3. Screen specifications

### 3.1 Compose (home screen)

**Purpose:** Where the FM spends most of their time. Two big actions, then their current open items.

```
┌─────────────────────────────┐
│  TWAOA Comms          [👤]  │  ← minimal header, bot status dot top-right
├─────────────────────────────┤
│                              │
│   ┌───────────────────┐    │
│   │  📢 New Notice      │    │  ← large tap target, primary color
│   └───────────────────┘    │
│   ┌───────────────────┐    │
│   │  💰 New Advertisement│   │  ← secondary but still prominent
│   └───────────────────┘    │
│                              │
│  Awaiting Approval (2)       │
│  ┌───────────────────────┐  │
│  │ Water outage notice    │  │  ← tap to see approval status
│  │ Submitted 2h ago        │  │
│  └───────────────────────┘  │
│  ...                         │
│                              │
│  Drafts (1)                  │
│  ┌───────────────────────┐  │
│  │ Diwali event flyer      │  │
│  └───────────────────────┘  │
│                              │
│  Recently Sent                │
│  ┌───────────────────────┐  │
│  │ ✅ AGM reminder — sent   │  │
│  │    3 groups · 12 reacts │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

Bot status dot (top-right, always visible): green/amber/red circle, tap for detail — this is the one piece of system chrome that's always present regardless of screen, since bot health is the thing most likely to silently fail.

### 3.2 New Notice / New Advertisement (compose flow)

Single flow, branches only on category (which drives the approval rule):

1. **Pick a template** (card grid, tap to select) or **Start from scratch**
2. **Fill in details** — title, body (pre-filled from template placeholders where applicable), category dropdown
3. **Add image** — three options as tabs/toggle: *Use template default* / *Generate poster* (goes to §3.3 sub-flow) / *Upload existing*
4. **Choose target groups** — checkboxes for all 8 groups + the Announcements Channel, defaulted to "All" with a one-tap "Just this tower" shortcut; MyGate shown as a separate always-visible reminder chip ("Remember to post to MyGate after sending — tap for ready-to-paste text")
5. **Review & Submit** — shows exactly what will be sent, exactly who it routes to for approval (pulled live from `approval_rules`), and a single Submit button

No multi-page wizard beyond this — five short steps, each fitting one phone screen, back/forward always available.

### 3.3 Poster generator (sub-flow from step 3 above)

Simple form, not a canvas editor:
- Headline (large text input)
- 1–2 detail lines
- Category (inherited from parent flow, changes the accent color/badge automatically)
- Optional tower badge (dropdown: All Towers / Venus / Jupiter / Neptune / Mercury)
- Live preview pane below the form, updates as the FM types
- "Generate" button → renders PNG via `html-to-image`, returns to compose flow with the image attached

### 3.4 Templates

Card grid, one card per template: name, category badge, small preview thumbnail if it has a default image. Tap → use in compose flow. "+ New Template" as a persistent card in the grid (not a separate button elsewhere) — keeps template creation discoverable in the same visual context as template use.

New template form: name, category, body with `{placeholder}` hints shown inline (e.g., a small chip under the text area listing available placeholders: `{tower}`, `{date}`, `{flat_count}`), optional default poster layout link.

### 3.5 History

The one screen where a dense table is appropriate — this reuses the water app's `/history` page pattern directly:
- Calendar heatmap at top (send volume by day)
- Filterable list below: category, tower, date range
- Each row: title, status badge, sent-to count, engagement (reactions/replies), tap to expand full per-group breakdown
- CSV export button (reused component)

### 3.6 Reports

Month selector at top. Below:
- **Notices sent** — count by category, by tower (simple bar chart, reusing water app's chart components)
- **Advertisements sent** — count, list with advertiser/rate/payment status
- **Revenue** — total collected/pending this month, exportable CSV for the treasurer
- **Approval turnaround** — average time submission→approval, single number + trend sparkline
- **Ad slot status** — current week's slot usage per group ("Venus Owners: 2/2 used")
- **Engagement snapshot** — aggregate reactions/replies trend, explicitly labeled "Engagement (not a read count)" so the distinction from §6 of the spec is visible in the UI itself, not just in internal docs

Read-only for all committee members; no edit actions live here.

### 3.7 Bot Status

Single-purpose screen, deliberately sparse:
- Large traffic-light indicator (green/amber/red) with plain-language status ("Connected and healthy" / "Reconnecting..." / "Disconnected — notices are not sending")
- Last heartbeat timestamp
- Recent disconnect history (last 5 events, from `bot_health_log`)
- If red: a visible "What to do" note — check the spare SIM procedure, contact info for who to escalate to (this is the one screen where a bit of instructional text is appropriate, since it's read during an actual incident)

### 3.8 Approval Queue (committee-facing)

For President/Secretary/VP/GC Chairs, reached either via dashboard login or the WhatsApp approval-group message directly (no login required for the WhatsApp path — that's the point of §5.2 in the spec).

Dashboard version: list of pending items, each showing title, category, submitted-by, submitted-when, and inline Approve/Reject buttons with a comment field for rejection. No separate "detail page" needed — everything needed to decide is visible in the list itself, since approvers are reviewing, not composing.

---

## 4. Interaction patterns

- **Status changes are always visible, never silent.** Every state transition (submitted → approved → sending → sent) shows as a toast/banner at the moment it happens if the FM is in-app, and always as an updated status badge if they check later.
- **Errors are actionable, not just reported.** A failed send shows which group failed and why (bot disconnected / removed from group / etc.), not just "failed."
- **No destructive action without confirmation** — deleting a draft, rejecting a notice, or removing a template all require a second tap/confirm.
- **The MyGate manual-paste step is a nudge, not a blocker.** The dashboard reminds but never prevents marking a notice "sent" on the WhatsApp side while MyGate posting is still pending — they're independent statuses.

---

## 5. Component reuse map (build efficiency)

| Component | Source | Reused as-is or adapted |
|---|---|---|
| Calendar heatmap | `tw-water-automation` `/history` | As-is |
| CSV export | `tw-water-automation` | As-is |
| Chart components | `tw-water-automation` dashboard | As-is |
| `html-to-image` poster pipeline | `tw-water-automation` infographic posters | Adapted (new templates, same pipeline) |
| Design tokens / Tailwind config | `tw-water-automation` / Ponnonam site | As-is |
| Resend signed-link approval UI | `tw-water-automation` spike alerts | Adapted (new payload shape) |

---

## 6. What's deliberately NOT in v1 UI

- No dark mode (not a stated need, adds scope)
- No customizable dashboard widgets
- No in-app chat/comments beyond the rejection-comment field
- No canvas-style image editor — only the templated poster form (§3.3)
- No role/permission management UI — roles come from the existing `committee_members` table, not configured here
