#!/usr/bin/env bash
# Minimal pull-build-restart deploy for a bare VPS/Oracle instance running the bot
# via systemd (infra/tw-comms-bot.service), not Docker. Run this ON THE SERVER, or
# have the deploy.yml GitHub Actions workflow SSH in and run it.
set -euo pipefail

DEPLOY_DIR="/opt/tw-comms"
cd "$DEPLOY_DIR"

git fetch origin
git reset --hard origin/main

corepack enable
pnpm install --frozen-lockfile --filter @tw-comms/whatsapp-bot...
pnpm --filter @tw-comms/whatsapp-bot build

sudo systemctl restart tw-comms-bot
echo "Deployed $(git rev-parse --short HEAD)"
