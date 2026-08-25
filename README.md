# tw-comms

TWAOA's notice/announcement broadcast tool. Monorepo: `apps/whatsapp-bot` (the send
pipeline, Baileys-based), `apps/web` (dashboard — Phase 3, not built yet),
`packages/shared` (shared types), `supabase/migrations` (schema for the shared
Supabase project this also serves `tw-water-automation` from).

## ⚠️ Baileys is a deliberate, temporary choice

`apps/whatsapp-bot` connects to WhatsApp via **Baileys**, an unofficial/reverse-
engineered client library — not Meta's official Business Platform API. That's a
known, accepted trade-off for this phase (free, fast to stand up), not an oversight.
It carries real account-ban risk that grew significantly after Meta's Jan 2026
enforcement tightening — see `claude/tw-comms-notice-tool-research-2026-08.md` in the
Trinity World Projects space for the full writeup. Practical implications baked into
this scaffold:

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
  else (health logging, config, the eventual approval workflow) doesn't know or care
  which transport is underneath.

## Known issue: installing from a network-restricted environment

Baileys 6.x pulls one transitive dependency (`libsignal-node`) straight from a GitHub
tarball rather than the npm registry. `pnpm install` will fail with a 403 on
`codeload.github.com` in any sandbox/CI environment whose egress is restricted to the
npm registry only — this isn't a bug in this repo, just something to know before you
assume `pnpm install` is broken. It installs cleanly from a normal network (your Mac,
a VPS, GitHub Actions' own runners).

## Local setup

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

## Hosting

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

## Database

`supabase/migrations/0001_bot_health_log.sql` — run this against the shared Supabase
project before setting `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. The bot degrades
gracefully without them (heartbeats just log locally instead of persisting), so you
can pair-test before Supabase access is issued.

## CI/CD

`.github/workflows/ci.yml` runs typecheck/lint/build on every PR and push to `main`.
`.github/workflows/deploy.yml` is a template (SSH deploy via `infra/deploy.sh`) —
it's `workflow_dispatch`-only until `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`
secrets exist and hosting is actually chosen.
