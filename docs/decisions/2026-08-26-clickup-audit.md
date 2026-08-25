# TW Comms — ClickUp Audit (2026-08-26)

## Snapshot

20 tasks total across the TW Comms folder (17 original + 3 added today: GitHub push,
hosting decision, Baileys-revisit gate). 1 complete (committee approval group
confirmed — MC/MCGC, using an existing group for soft-launch rather than a new one),
5 in progress (this session's scaffolding work), 14 to do. **Phases 2 through 5 and
Rollout & Launch Gate have zero tasks defined** — they exist only as list headers.

## The structural gap: four phases with no work items

Phase 2 (Approval Workflow), Phase 3 (Dashboard), Phase 4 (Image Generation), and
Phase 5 (Analytics/Ads/Revenue) are empty. That's fine while Phase 1 is still open,
but worth naming explicitly so it doesn't look more planned-out than it is. When
you're ready, each needs real tasks — a rough starting shape:

- **Phase 2**: how the bot recognizes an approval (reaction? keyword reply?), an
  approver allowlist mapped to committee roles, what happens on rejection/edit, an
  audit trail of who approved what and when.
- **Phase 3**: compose UI, template library, send history, auth for committee
  members (likely needs to work well on phones, not just desktop).
- **Phase 4**: brand/template guardrails and a moderation step before an
  AI-generated image goes out under the Association's name — "generate freely" is
  the wrong default here.
- **Phase 5**: this one has a policy question underneath it, not just engineering —
  see below.

## Two things I'd flag before more building happens

**1. Resident consent for WhatsApp messaging isn't tracked anywhere yet.** India's
DPDP Act requires *explicit opt-in* consent for this kind of messaging — specific to
WhatsApp as a channel, collected separately from any other consent, with an easy
opt-out honored per-message, and consent records kept for 7 years. Full enforcement
starts May 13, 2027, but the Data Protection Board is already active and enforcement
is complaint-driven, so "we'll deal with it before the deadline" carries some real
risk if this launches broadly before then. There's no task anywhere for how residents
get added to the announcements channel or how consent gets recorded — worth deciding
before Phase 2/3 gets built, since it affects the rollout flow itself, not just a
box to check later. A `consent_log` table alongside `bot_health_log` would be a
natural place to put this.

**2. Phase 5's "ad slots / revenue" is a governance decision, not just a build.**
Selling sponsor placement in official Association notices likely has real
implications — GST registration if there's revenue, AGM/committee sign-off, and
residents' reaction to receiving sponsored content through what's meant to be an
official channel. Worth a committee decision recorded somewhere before any engineering
time goes toward it, the same way the Baileys-vs-official-API call got written down
rather than just assumed.

## Smaller items already added today

Three tasks created in Phase 0 to reflect work actually in progress: pushing the repo
to GitHub, deciding hosting (Oracle vs GCP e2-micro vs paid VPS, per today's
research), and a gate to revisit the Baileys decision before Phase 2 goes live
against the real Association number. Five Phase 1 `[agent]` tasks moved to "in
progress" with comments on exactly what's built vs. still needing a live test.

## Not urgent, but worth knowing about

No task has an assignee or due date yet — fine at this stage, but will matter once
more than one person/agent is working across phases. Phase 1 could also use tasks for
message dedup on reconnect (avoid double-sends) and alerting off `bot_health_log`
(the heartbeat table exists but nothing currently watches it) — minor, can fold into
existing tasks rather than needing new ones.

## What I didn't do

I added the three tasks above because they directly reflect work already done or
already decided. I did *not* populate Phase 2–5 or add a consent/compliance task,
since those involve real product and legal calls — flagging them here rather than
deciding for the team.
