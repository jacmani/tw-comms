# Bot only — apps/web isn't scaffolded yet (Phase 3). This image is NOT for serverless
# platforms (Vercel, Cloud Run min-instances=0, Lambda): Baileys holds a persistent
# WebSocket and needs a container that stays up, not one that scales to zero.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/whatsapp-bot/package.json apps/whatsapp-bot/package.json
RUN pnpm install --frozen-lockfile --filter @tw-comms/whatsapp-bot...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/whatsapp-bot apps/whatsapp-bot
RUN pnpm --filter @tw-comms/whatsapp-bot build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/whatsapp-bot/node_modules /app/apps/whatsapp-bot/node_modules
COPY --from=build /app/apps/whatsapp-bot/dist /app/apps/whatsapp-bot/dist
COPY --from=build /app/apps/whatsapp-bot/package.json /app/apps/whatsapp-bot/package.json

# auth_state must be a mounted volume — losing this directory means re-scanning the
# QR code on every deploy, which also looks exactly like the "compromised session"
# behavior WhatsApp's abuse detection watches for. See README "Hosting" section.
VOLUME ["/app/apps/whatsapp-bot/auth_state"]
WORKDIR /app/apps/whatsapp-bot
ENV BOT_AUTH_STATE_DIR=/app/apps/whatsapp-bot/auth_state
CMD ["node", "dist/index.js"]
