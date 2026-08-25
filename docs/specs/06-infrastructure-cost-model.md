# TWAOA FM Communication Tool — Infrastructure Cost Model

**Document 6** · Companion to `01`–`05`
**Question addressed:** What does the whole system actually cost to run, per month and per year, including SIM procurement and upkeep?
**Date:** August 2026

---

## 1. Bottom line first

| Scenario | Monthly | Yearly |
|---|---|---|
| **Realistic ongoing cost** (after year-1 setup) | **₹550–₹750** (~$7–$9) | **₹6,600–₹9,000** (~$80–$108) |
| **Bare-minimum floor** (if you accept more manual work / risk) | **₹150–₹250** | **₹1,800–₹3,000** |
| **Year 1 only** (one-time procurement on top of ongoing) | add **₹500–₹1,000** once | — |

For context: this is less than what TWAOA likely spends on printing physical notices for one large event, running as the recurring cost of the entire digital communication system for 814 flats, indefinitely. The dominant cost is not AI (near-zero, per the previous report) — it's the two SIM cards and the always-on server.

---

## 2. Line-by-line breakdown

### 2.1 SIM cards (primary + spare) — the biggest line item

This needs its own explanation because "just keep a number active" has gotten more expensive in India — TRAI rules removed the old sub-₹50 "validity only" recharges industry-wide, so even a bare WhatsApp-only number needs a real data/voice plan now, not a token top-up.

**What the bot actually needs from the SIM:** WhatsApp Web protocol traffic (persistent low-bandwidth connection, occasional image uploads/downloads), no voice calls, minimal SMS (only for the initial WhatsApp registration OTP). This is genuinely light usage — well under 1GB/month of actual data even sending several notices a week with images.

**Recommended plan: Jio's annual "calling only" plan (~₹1,559–1,600/year, 365-day validity, 24GB total data for the year, unlimited Jio-network calls, 100 SMS/day).** This is a strong fit specifically because:
- The bot doesn't need daily data caps — it needs total headroom over a year, and 24GB/year is far more than a WhatsApp bot sending text + occasional posters will use
- Annual validity means no monthly recharge risk of the number lapsing (a lapsed number = WhatsApp account risk, worth avoiding entirely)
- It's the cheapest annual option that still includes real data (not a calling-only-zero-data plan, which WhatsApp needs at least some data for)

**Two numbers needed** (primary bot + pre-warmed spare, per the ban-risk mitigation in the architecture report):

| Item | Cost |
|---|---|
| Primary SIM, Jio annual plan | ₹1,559–1,600/year |
| Spare SIM, same plan | ₹1,559–1,600/year |
| **SIM subtotal** | **₹3,118–3,200/year (~₹260/month averaged)** |

**One-time SIM procurement cost (year 1 only, not recurring):** physical SIM cards are typically free or ₹20–50 each from any Jio store with Aadhaar-based eKYC (15–30 minutes per SIM, in person). Budget **₹100 total, one-time**, plus the time cost of two in-person visits (this cannot be done remotely — physical SIM + biometric KYC is mandatory in India for a new connection).

**A cheaper alternative worth naming honestly:** if you're willing to accept slightly more operational risk, a single SIM (no spare) on the same Jio annual plan halves this to ~₹1,600/year. The architecture report's recommendation to keep a spare is a deliberate insurance choice given the ban-risk research — this is the one line item where "bare minimum" and "recommended" genuinely diverge, and it's worth you and the committee explicitly deciding whether that insurance is worth ~₹1,600/year rather than treating the spare as automatically justified.

### 2.2 Bot hosting (always-on VM/PaaS for the Baileys process)

The bot needs a persistent process — not Vercel serverless (per the architecture report). Options ranked by cost:

| Option | Cost | Notes |
|---|---|---|
| **Oracle Cloud Always Free tier** | ₹0/month | Genuinely free forever, but: requires a credit card at signup (some Indian cards get rejected), ARM architecture (minor compatibility considerations for Baileys/Node, generally fine), no India datacenter (~40–80ms latency, irrelevant for a bot posting occasional messages), and community reports of instance availability issues in some regions. Worth attempting first since it's free, with a paid fallback ready if it doesn't work out. |
| **Indian VPS (e.g., AIC Cloud, or similar INR-billed provider)** | ₹99–229/month (~₹1,200–2,750/year) | UPI/INR billing, no international card friction, Indian datacenter (lower latency, though not critical here), straightforward setup |
| **Railway/Render background worker** | ~$5–7/month (~₹420–590/month, ~₹5,000–7,000/year) | Simplest developer experience (git-push deploy), but priced in USD, meaning currency conversion friction and typically the most expensive of the three options at this scale |

**Recommendation: attempt Oracle Cloud Always Free first** (₹0/month) since the bot's resource needs are genuinely tiny (a lightweight Node process, not a database or web server under real load) and easily fits Oracle's free-tier specs. **Budget the Indian VPS option (~₹150–229/month, ~₹1,800–2,750/year) as the realistic fallback** if Oracle's signup friction (card rejection is common) or ARM compatibility becomes a blocker — this is the number to actually budget for, treating Oracle as a bonus if it works rather than a plan to rely on.

### 2.3 Supabase (database)

This is where the answer depends on something I can't see from here: **whether the existing `tw-water-automation` Supabase project is already on a paid Pro plan or still on Free.**

- **If already on Supabase Pro ($25/month) for the water project:** this new project's data (notices, templates, approvals, sends, ad slots) adds to the *same* project and the *same* $25/month — **effectively ₹0 incremental cost**, since you're sharing infrastructure exactly as the architecture doc specified. This is the strongest argument for the "same Supabase project" decision already made — it's not just architecturally cleaner, it's financially free for this new project to piggyback on.
- **If the water project is still on Supabase Free:** the free tier's 500MB database cap and 7-day-inactivity pause become a real risk once this system is live (a paused database means the bot can't function, silently, on a Sunday nobody's checking). At that point, **upgrading to Pro ($25/month, ~₹2,075/month, ~₹24,900/year) becomes a shared cost across both projects**, not something this project alone should be charged for — worth splitting mentally as "half of this is really a water-project cost that happens to unlock now."

**This is the single line item most worth confirming before finalizing the budget** — the swing between "₹0 incremental" and "₹24,900/year shared" is the largest in this whole report.

### 2.4 Resend (email approvals)

Free tier: 3,000 emails/month, capped at 100/day. At TWAOA's realistic volume (24 committee members, ~15–25 notices/month each triggering approval emails to a handful of eligible approvers, plus the after-the-fact emergency notifications) — this comfortably stays under 3,000/month. **The only real risk is the 100/day cap on a day with an unusual burst of activity** (e.g., several notices submitted the same day during festival season), which is a low-probability, low-consequence event (a delayed email, not a lost one — Resend queues rather than drops).

**Cost: ₹0/month, indefinitely, at this scale.** No upgrade path needed unless volume grows by roughly 30–100x, which isn't realistic for a single residential community's notice volume.

### 2.5 AI (text drafting + occasional image assist)

Per the previous cost report: Gemini paid tier (chosen specifically for data-privacy reasons, not because the free tier is insufficient) costs **under $5/year (~₹420/year, ~₹35/month)** at TWAOA's realistic drafting volume. This is genuinely negligible against every other line item here.

### 2.6 Domain (for Resend's verified sending domain)

The architecture already notes `trinitywoldwater.in` or similar was suggested for the water project's Resend verification. If this new project reuses the same verified domain (recommended, matching the "same infrastructure" decision) — **₹0 incremental**, since the domain is already a water-project cost. If a separate subdomain/domain were needed, a `.in` domain typically runs **₹500–800/year**, but there's no technical reason to need a separate one here.

### 2.7 MyGate, WhatsApp Channel, misc.

- MyGate: no cost — this remains manual-paste per the spec, no subscription or API fee involved
- WhatsApp Channel: free to create, no cost
- `baileys-antiban` middleware: free, open-source (MIT license)
- ClickUp: assumed already in use for other TWAOA projects (visible in your workspace) — no incremental cost attributable to this project specifically

---

## 3. Consolidated monthly/yearly table

| Item | Monthly (₹) | Yearly (₹) | Notes |
|---|---|---|---|
| SIM — primary | ~130 | 1,559–1,600 | Jio annual plan |
| SIM — spare | ~130 | 1,559–1,600 | Optional insurance — see §2.1 |
| Bot hosting | 0–229 | 0–2,750 | Oracle free tier attempt first; Indian VPS as budgeted fallback |
| Supabase | 0 (if piggybacking on existing Pro) or shared 2,075 | 0 or shared 24,900 | **Needs confirmation — see §2.3** |
| Resend | 0 | 0 | Comfortably within free tier |
| AI (Gemini paid tier) | ~35 | ~420 | For data-privacy reasons, not necessity |
| Domain | 0 | 0 | Reuse existing water-project domain |
| **Total (SIM insurance included, Supabase already paid via water project)** | **~₹525/month** | **~₹6,330/year** | |
| **Total (single SIM, no spare, same Supabase assumption)** | **~₹395/month** | **~₹4,770/year** | |
| **Total (if Supabase upgrade is newly needed, full cost attributed here)** | **~₹2,600/month** | **~₹31,230/year** | Worst case — confirm this doesn't apply |

---

## 4. What drives the range, and the two decisions that matter most

1. **Is the existing Supabase project already Pro, or still Free?** This is a ~₹24,900/year swing — by far the largest variable in this entire report, and worth checking before any budget goes to the committee. If it's already Pro for the water project, this new project is nearly free to add.
2. **Single SIM vs. spare SIM.** A ~₹1,600/year insurance decision against the ban-risk findings from the architecture report — reasonable either way, but should be a conscious committee-level choice given it's presented as recommended, not mandatory.

Once those two are settled, the actual number is small — genuinely in the range of "a rounding error against TWAOA's annual maintenance budget," not a line item that needs quarterly scrutiny.

---

## 5. Sustainability check for the 2–3 year window

- **SIM costs are the most predictable** — annual plans, and Indian telecom pricing on this segment (basic annual data+voice) has been relatively stable; budget a 10–15% margin for a possible price rise over 2–3 years, not more.
- **Supabase and Resend free-tier terms can change** (as the AI-provider report also flagged for Gemini) — this isn't unique to AI infrastructure. Revisit this cost model annually, not just at launch, as a standing agenda item rather than a one-time exercise.
- **The single largest risk to this budget isn't a line item — it's the SIM ban risk itself.** If the primary number gets banned and no spare was purchased, the *unbudgeted* cost is an emergency SIM procurement plus several days of manual FM workarounds while groups get re-added — an operational cost, not a financial one, but worth naming since it's the scenario the spare SIM is specifically insuring against.
