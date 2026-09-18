/**
 * "Approval audit trail / export" (ClickUp 86d44wm7b) — CLI export until Phase 3's
 * dashboard has its own download button for the same data.
 *
 * Usage:
 *   pnpm --filter @tw-comms/whatsapp-bot export-audit > audit-trail.csv
 *   pnpm --filter @tw-comms/whatsapp-bot export-audit -- --notice <notice-id> > one-notice.csv
 */
import { formatAuditTrailCsv } from "@tw-comms/shared";
import { getAuditTrail } from "./approvals/audit.js";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  const cleaned = argv.filter((a) => a !== "--");
  for (let i = 0; i < cleaned.length; i += 1) {
    if (cleaned[i].startsWith("--")) {
      args[cleaned[i].slice(2)] = cleaned[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = await getAuditTrail({ noticeId: args.notice });
  process.stdout.write(formatAuditTrailCsv(rows) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
