# tw-comms

**TWAOA's official notice board, on WhatsApp — with a safety check built in.**

## The problem this solves

Right now, if the Trinity World Apartment Owners Association needs to tell every
resident something — the water supply is being shut off Tuesday morning, the AGM is
next Sunday, a security notice, a maintenance due-date reminder — there's no single,
reliable way to do it. It ends up happening some mix of these ways, each with its own
problem:

- **A committee member forwards it from their personal WhatsApp.** Residents can't
  always tell if it's really official, the same message gets typed out slightly
  differently by different people, and it puts that person's personal number out
  there attached to Association business.
- **A paper notice on a board.** Only reaches people who physically walk past it.
- **The MyGate app (or similar).** Not everyone opens it regularly, and not every
  resident has it set up.
- **Word of mouth / building WhatsApp groups.** Fast, but nothing keeps track of who
  actually sent what, when, or whether the right people signed off on it before it
  went out.

None of these give the Association a dependable way to reach *everyone*, in one
recognizable place, with a record of what was sent and who approved it. That's what
this project is: **one official channel, with the committee's approval built into the
process before anything reaches residents.**

## What it actually is, in plain terms

Think of it as a notice board that a robot manages for the committee, with one rule:
**nothing goes on the board until someone from the committee says yes.**

Here's the whole flow, in order:

1. **Someone drafts a notice.** ("Water will be off from 9am–1pm on Tuesday for tank
   cleaning.")
2. **The bot posts the draft into a private committee group** — not to residents yet,
   just to the people who are allowed to approve notices (the President, Secretary,
   VP, and the four Tower GC Chairs, at minimum).
3. **A committee member reacts with a 👍 (or replies "APPROVE").** The bot checks that
   the person reacting is actually one of the approved committee members — a random
   reaction from someone not on that list doesn't count.
4. **Only then does the bot post the notice to the resident-facing announcements
   channel** — the one place residents can trust is really from the Association,
   because nothing lands there without a committee sign-off first.
5. **Every step is recorded** — who approved it, when, and what was actually sent —
   so there's a real record, not just a memory of "someone probably okayed that."

If a committee member reacts 👎 instead, the notice doesn't go out, and whoever
drafted it gets told why, so they can fix it and resubmit.

Later phases (not built yet) add: a simple web page for drafting notices and picking
from templates instead of doing it by hand, generating a nice poster-style image to
go with a notice, and — since this has been approved by governance — the ability to
carry a small sponsor credit on a notice as a way to fund Association initiatives
(similar to how the Ponnonam event page already carries a sponsor logo).

## Why "with the committee's approval built in" matters

This isn't just a broadcast tool — the approval step is the whole point. A robot that
can post to an official residents' channel without a human checking first is a
liability (wrong info, a mistake, or worse, going out under the Association's name).
Requiring a real committee member to say yes, every time, before anything reaches
residents, is what makes this trustworthy enough to be the *official* channel instead
of just another group chat.

## Where this stands right now (updated as the project moves along)

This is a working prototype, not a finished product yet. As of now: the WhatsApp
connection and the "draft → committee approves → sends" pipeline are being built and
tested with a spare/test number — not the Association's real number — precisely
because a mistake at this stage should cost nothing. See
`docs/decisions/2026-08-whatsapp-approach-research.md` for why a test number matters
here specifically. Track live progress on the ClickUp board (Team Space → 📲 TW
Comms).

---

## For anyone working on the code

### Architecture

Monorepo: `apps/whatsapp-bot` (the actual WhatsApp connection + send pipeline,
Node.js + Baileys), `apps/web` (the dashboard from the "how it works" section above —
Phase 3, not built yet), `packages/shared` (shared types), `supabase/migrations`
(the database this all runs on — shared with the `tw-water-automation` project).

### ⚠️ Baileys is a deliberate, temporary choice

`apps/whatsapp-bot` connects to WhatsApp via **Baileys**, an unofficial/reverse-
engineered client library — not Meta's official Business Platform API. That's a
known, accepted trade-off for this phase (free, fast to stand up), not an oversight.
It carries real account-ban risk that grew significantly after Meta's Jan 2026
enforcement tightening — see `docs/decisions/2026-08-whatsapp-approach-research.md`
for the full writeup. Practical implications baked into this scaffold:

- **Never pair your personal or the Association's primary number for casual testing.**
  Use a spare number you don't mind losing until this is proven stable.
- Frequent reconnects (e.g. from running the bot on a laptop that sleeps, or in a
  short-lived cloud sandbox) look like the exact behavioral irregularity abuse
  detection watches for. Prefer a host that stays up (see Hosting below) even for
  testing, once you're past the first pairing check.
- `baileys-antiban` (wired in via `wrapSocket` in `src/connection.ts`) rate-limits and
  paces sends — it helps with the *behavioral* detection layer, but does nothing
  against protocol-level fingerprinting. Don't treat it as making this risk-free.
- Migrating off Baileys later means replacing `apps/whatsapp-bot/src/connection.ts`
  and `send.ts` — that's the whole surface area that talks to WhatsApp. Everything
  else (health logging, config, the approval workflow) doesn't know or care which
  transport is underneath.

### Local setup

```bash
corepack enable
pnpm install
cp .env.example .env   # fill in at least BOT_AUTH_STATE_DIR; Supabase vars optional for a first pairing test
pnpm dev:bot
```

First run prints a QR (also saved to `apps/whatsapp-bot/qr.png`) — scan it from
**WhatsApp → Linked Devices → Link a Device** on the number you're testing with. Once
connected, the log lists every group JID the account belongs to; copy the committee
group's JID into `.env` as `COMMITTEE_GROUP_JID`.

To send a one-off test message once paired:

```bash
pnpm --filter @tw-comms/whatsapp-bot send -- --to committee --text "test notice from tw-comms"
```

### Hosting

Not decided yet as of this scaffold — `infra/` has both paths ready so the choice
doesn't block building:

- **Docker** (`infra/Dockerfile`, `infra/docker-compose.yml`) — works anywhere
  Docker runs, including a VPS.
- **Bare systemd** (`infra/tw-comms-bot.service`, `infra/deploy.sh`) — lower overhead,
  better fit for a small free-tier ARM instance.

Whichever host: it must hold a **persistent process**, not a serverless/scale-to-zero
function — Baileys needs a long-lived WebSocket. And `auth_state/` (or the
`bot-auth-state` volume) must survive restarts/redeploys, or you're re-scanning the
QR code every time, which itself is a ban-risk signal.

### Database

`supabase/migrations/` — run these against the shared Supabase project before setting
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. The bot degrades gracefully without them
(heartbeats just log locally instead of persisting), so you can pair-test before
Supabase access is issued.

### CI/CD

`.github/workflows/ci.yml` runs typecheck/lint/build on every PR and push to `main`.
`.github/workflows/deploy.yml` is a template (SSH deploy via `infra/deploy.sh`) —
it's `workflow_dispatch`-only until `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`
secrets exist and hosting is actually chosen.

### Task tracking

Work is tracked on ClickUp (Team Space → 📲 TW Comms), not GitHub Issues — see
`CLAUDE.md` for how Claude Code should work against that board.
