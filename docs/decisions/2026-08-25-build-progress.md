# TW Comms — Build Progress (2026-08-25)

## Decision made
Proceeding with Baileys for now (accepted risk, per research doc), to get something testable. Migration to the official Cloud API stays an open option later — the bot's WhatsApp-talking code is isolated to `apps/whatsapp-bot/src/connection.ts` + `send.ts` specifically so that swap doesn't touch the rest of the system.

## What's built
Repo scaffolded and committed: `~/Projects/trinity-world/tw-comms` on Jacob's Mac (pnpm workspace: `apps/whatsapp-bot`, `apps/web` placeholder, `packages/shared`, `supabase/migrations`, `infra/`). Covers these Phase 1 ClickUp tasks (marked in-progress with comments, not done — none of it has been run against a live network/WhatsApp session yet):
- Scaffold repo structure
- Baileys base connection + auth state persistence
- baileys-antiban integration
- Reconnection logic w/ exponential backoff
- Bot health heartbeat + `bot_health_log` Supabase migration
- Manual-trigger send CLI (`src/send.ts`)

**Known issue found while building:** `@whiskeysockets/baileys` (even the stable 6.7.24 "legacy" line) pulls `libsignal-node` from a raw GitHub tarball rather than npm. This fails outright in network-restricted environments (confirmed in the cloud sandbox — `codeload.github.com` returns 403). Needs verifying on a normal, unrestricted network before "scaffolding" can be called done — noted in the repo README so nobody mistakes it for a code bug later.

**Environment note:** the Mac device-bridge shell used to write these files onto Jacob's disk has no outbound network access at all (org proxy blocks everything) and no Homebrew/gh installed inside it. So `pnpm install`, installing `gh`, `gh auth login`, and `gh repo create` all need to be run by Jacob directly in his own Terminal — not something Claude could execute through the bridge.

## Hosting research (asked: best free hosting for 3–4+ years)

| Option | Free duration | Resources | Caveats |
|---|---|---|---|
| **Oracle Cloud Always Free (Ampere A1, ARM)** | Indefinite by policy | 2 OCPU / 12GB RAM (cut from 4/24 in June 2026, no announcement) | Best resources by far; known signup/capacity friction; Oracle already quietly shrank it once in 2026, so "free forever" is a live policy, not a guarantee |
| **Google Cloud e2-micro Always Free** | Indefinite, publicly offered since 2017 (longest track record) | ~1 vCPU burst / 1GB RAM | Only free in us-west1/us-central1/us-east1 — US-hosted for an India bot (fine for WhatsApp, not latency-sensitive); egress charges beyond free allowance, but a notice bot's traffic is tiny |
| AWS free tier | 12 months only | — | Ruled out — not free long-term |
| Paid VPS (~₹150–229/mo) | N/A | Full control | Already the fallback in the original Phase 0 task if both free options fail |

**Recommendation:** Try Oracle first as originally planned (way more headroom even after the cut). If signup/capacity issues block it, go to Google Cloud's e2-micro before paying for a VPS — it's free indefinitely with the longer proven track record, just smaller (still enough for a lightweight Baileys process). Only fall back to a paid VPS if both free options are genuinely unworkable.
