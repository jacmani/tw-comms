/**
 * "Cost tracking + budget alert" (ClickUp 86d44wmgv). Free-tier providers don't
 * bill per-call, so this tracks USAGE against each provider's free daily
 * allowance, not a currency amount — see image_gen_cost_log's `usage_estimate`/
 * `usage_unit` columns (0008_image_gen.sql). The actual DB write is the caller's
 * job (this package stays Supabase-agnostic, same separation as
 * @tw-comms/shared's formatAuditTrailCsv vs. the bot's audit.ts query).
 */
export function shouldAlertOnUsage(
  usedToday: number,
  dailyQuota: number,
  thresholdRatio = 0.8
): boolean {
  if (dailyQuota <= 0) return false; // no known quota (e.g. Pollinations) — nothing to alert against
  return usedToday / dailyQuota >= thresholdRatio;
}
