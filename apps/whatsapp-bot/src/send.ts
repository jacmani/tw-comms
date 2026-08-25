/**
 * Manual-trigger send (Phase 1: "basic manual-trigger send"). Deliberately a one-shot
 * CLI script, not a long-running server yet — Phase 2's approval workflow is what
 * turns this into something the committee triggers without touching a terminal.
 *
 * Usage:
 *   pnpm --filter @tw-comms/whatsapp-bot send -- --to committee --text "Test notice"
 *   pnpm --filter @tw-comms/whatsapp-bot send -- --to announcements --text "Test notice"
 *   pnpm --filter @tw-comms/whatsapp-bot send -- --to <raw-jid> --text "Test notice"
 *
 * Requires an existing paired session (run `pnpm dev:bot` once first and keep
 * apps/whatsapp-bot/auth_state around).
 */
import { BotConnection } from "./connection.js";
import { config, required } from "./config.js";
import { logger } from "./logger.js";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function resolveJid(to: string): string {
  if (to === "committee") return required("COMMITTEE_GROUP_JID");
  if (to === "announcements") return required("ANNOUNCEMENTS_JID");
  if (to.includes("@")) return to; // already a raw JID
  throw new Error(`Unrecognized --to value "${to}". Use committee, announcements, or a raw JID.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.to || !args.text) {
    console.error('Usage: send -- --to <committee|announcements|jid> --text "message"');
    process.exit(1);
  }
  const jid = resolveJid(args.to);

  const bot = new BotConnection({
    onReady: async (sock) => {
      logger.info({ jid }, "sending manual test message");
      await sock.sendMessage(jid, { text: args.text });
      logger.info("sent — leaving socket open for delivery confirmation, ctrl-C to exit");
    },
  });

  await bot.start();
}

main().catch((err) => {
  logger.fatal({ err }, "send failed");
  process.exit(1);
});
