import { writeFile } from "node:fs/promises";
import { BotConnection } from "./connection.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

/**
 * Entry point. Local dev: `pnpm dev:bot`, scan the QR (also saved to qr.png so it can
 * be opened from a headless host / sent over the device bridge), then watch the logs
 * for "connection open". On first run it also logs every group JID the account is a
 * member of — use that to fill in COMMITTEE_GROUP_JID in .env.
 */
async function main() {
  const bot = new BotConnection({
    onQr: async (dataUrl) => {
      const base64 = dataUrl.split(",")[1];
      await writeFile("qr.png", Buffer.from(base64, "base64"));
      logger.info("QR saved to apps/whatsapp-bot/qr.png — scan it, then delete it.");
    },
    onReady: async (sock) => {
      logger.info("Bot connected. Listing joined groups to help find COMMITTEE_GROUP_JID:");
      try {
        const groups = await sock.groupFetchAllParticipating();
        for (const [jid, meta] of Object.entries(groups)) {
          logger.info(`  ${jid}  ${(meta as { subject?: string }).subject ?? ""}`);
        }
      } catch (err) {
        logger.warn({ err }, "could not list groups (older Baileys/account state)");
      }

      if (!config.committeeGroupJid) {
        logger.warn(
          "COMMITTEE_GROUP_JID is not set yet — manual-trigger sends (src/send.ts) will fail until it is."
        );
      }
    },
  });

  await bot.start();

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      logger.info({ sig }, "shutting down");
      bot.stop();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  logger.fatal({ err }, "fatal error on startup");
  process.exit(1);
});
