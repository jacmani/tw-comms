# TW Comms (Notice Management Tool) — ClickUp Status + Build Approach Review
*Compiled 2026-08-25*

## 1. Where the project actually stands in ClickUp

The notice/announcement tool lives under **Team Space → 📲 TW Comms**, planned as 6 phases (Phase 0 through Rollout) plus a Bugs list. Right now:

- **17 open tasks total, 0 completed.** Everything is still in **Phase 0 (Human Prerequisites)** and **Phase 1 (Core Send Pipeline & Bot Resilience)**. Phases 2–5 (Approval Workflow, Dashboard, Image Generation, Analytics/Ads/Revenue) and Rollout exist only as empty list headers — no tasks written yet.
- **Phase 0** (6 tasks, all "to do"): procure a primary Association SIM + WhatsApp-register it, procure a *spare* SIM as a silent backup, confirm which committee WhatsApp group is used for approvals, provision bot hosting (Oracle free tier attempt → VPS fallback), issue Supabase service-role credentials, and **send a MyGate partner/API inquiry email** (low priority, still unsent as far as the task shows).
- **Phase 1** (9 tasks, all "to do"): scaffold a `tw-comms` monorepo (SvelteKit web app + Node/Baileys bot + Supabase migrations), build a Baileys base connection with persisted auth state, integrate `baileys-antiban` middleware, add reconnection/backoff logic, log bot health to Supabase, get the bot into the committee approval group with manual-trigger sending, create the "TWAOA Announcements" WhatsApp channel, and finally run a 7-day live test-send window as the Phase 1 exit gate.

So: nothing has been built yet — this is a clean point to reconsider the architecture before code gets written.

## 2. The architecture as currently planned

- **Bot layer:** Node.js using **Baileys**, an unofficial, reverse-engineered WhatsApp Web client library (no browser, direct WebSocket to WhatsApp's servers), hardened with `baileys-antiban` middleware and a spare "decoy" SIM.
- **Backend:** Supabase.
- **Dashboard:** SvelteKit (compose, templates, send history — Phase 3).
- **Flow:** bot sits in a committee approval group → committee approves → bot broadcasts to a WhatsApp "TWAOA Announcements" channel.
- **Later phases:** image generation for notices, analytics, and even an "ad slots / revenue" phase.

## 3. What's changed since the last research pass — this is the important part

**Meta tightened enforcement specifically in this window.** Effective **January 15, 2026**, Meta restricted third-party/unofficial automation on WhatsApp more aggressively, explicitly targeting "general-purpose" bots and unofficial integrations riding on WhatsApp's protocol.

More concretely, for a Baileys-based approach specifically:

- Meta now runs **layered detection** — protocol/handshake fingerprinting (catches an unofficial client *before* it even sends a message), behavioral-pattern analysis, spam-report velocity, and shared-infrastructure correlation across numbers. Anti-ban middleware like `baileys-antiban` (already in your Phase 1 plan) mitigates the behavioral layer only — it does nothing against protocol fingerprinting, which is the layer that catches Baileys fastest.
- Independent research cited **68% of Indian businesses using unofficial WhatsApp tools reporting at least one ban within 12 months**, with Baileys/whatsmeow/Evolution API/WAHA-class tools typically flagged within **2–8 weeks**.
- Ban recovery is slow and unreliable: **2–8 weeks, with only a 30–40% first-appeal success rate.** For a building where this becomes *the* announcement channel, that's a multi-week to multi-month blackout risk, not a minor bug.
- One more wrinkle: the "spare SIM as a silent backup" idea in Phase 0 is actually a pattern Meta's shared-infrastructure detection specifically looks for (multiple numbers behind correlated infra/behavior) — it may make things worse, not safer.

**Bottom line:** the core premise the Phase 1 plan is built on — Baileys + anti-ban middleware + spare SIM — is meaningfully riskier today than it likely looked a few months ago, and the plan's own Phase 1 exit gate (a 7-day live test) won't surface that risk, since bans commonly land weeks later.

## 4. The compliant alternative, and its real cost

The official path is the **WhatsApp Business Platform (Cloud API)**, either direct via Meta or through a Business Solution Provider (Twilio, Gupshup, WATI, AiSensy, Interakt, 360dialog, Whautomate, etc.). Zero ban risk, Meta-hosted, but:

- Outbound notices to residents who haven't messaged first are billed as **Marketing** template messages (the priciest category) unless a message is genuinely tied to a prior resident action (e.g. a maintenance-due reminder might qualify as **Utility**, which is far cheaper).
- **India rates (2026):** Marketing ≈ **₹0.86/message** + 18% GST; Utility ≈ **₹0.115/message** outside an open service window, free inside one. BSP markups range from ~0% (Whautomate) to ~26% (AiSensy) on top of Meta's base rate.
- For a building sending occasional notices to a couple hundred flats, this is likely a few hundred to low-thousands of rupees a month — not free like the current "free unofficial bot" assumption, but modest, and it removes the ban risk entirely. This is a real budget line the committee should sign off on, not a silent architecture swap.

## 5. Worth closing the loop on before writing more code

The Phase 0 task **"Send MyGate partner/API inquiry email"** suggests build-vs-buy was already on the table but never resolved. Off-the-shelf Indian RWA platforms (MyGate, NoBrokerHood, ADDA, SocietyEasy, and others) already ship notice boards and resident broadcast at roughly ₹3–15/flat/month. They won't give the custom branding, image generation, or "ad slots/revenue" features roadmapped for later phases — but if the near-term need is just "get notices to residents reliably," it's worth a deliberate decision rather than defaulting into a multi-phase custom build.

## 6. Recommendation

Before continuing Phase 1 (which is entirely about hardening the Baileys bot), get a decision on the channel architecture:

1. **Pivot the send-channel to the official Cloud API** via a low-markup BSP now, while the repo is still unscaffolded — the `apps/whatsapp-bot` package boundary already in the spec makes this a contained swap rather than a rewrite.
2. **Keep Baileys but go in eyes-open** — treat it explicitly as a temporary/high-risk bridge (e.g., only for the initial test-send window), with a committed migration plan to the Cloud API before this becomes the building's primary channel.
3. **Revisit build vs. buy** — actually send/resolve the MyGate inquiry (and glance at NoBrokerHood/ADDA) before investing further engineering time, in case an off-the-shelf tool already covers the core notice need.

None of these are technical calls I should make unilaterally — they trade off cost, control, and committee risk tolerance, so flagging for a decision rather than picking one.
