import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BanRiskLevel } from "baileys-antiban";
import { config } from "./config.js";
import { logger } from "./logger.js";

/** Baileys connection state — distinct from the bot_health_log event vocabulary below. */
export type BotStatus = "connecting" | "open" | "reconnecting" | "closed";

/** Matches 01-specification.md §4.5's event_type enum (ClickUp 86d45pbj8). */
export type BotHealthEventType = "heartbeat" | "disconnect" | "reconnect" | "ban_suspected";

let client: SupabaseClient | null = null;
if (config.supabase.url && config.supabase.serviceRoleKey) {
  client = createClient(config.supabase.url, config.supabase.serviceRoleKey);
} else {
  logger.warn(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — health events will only log locally, not persist. Fine for local pairing tests, not for the hosted bot."
  );
}

export function isElevatedRisk(risk: BanRiskLevel | undefined): boolean {
  return risk === "high" || risk === "critical";
}

/**
 * Edge-triggers a ban_suspected alert: true only when risk just crossed into
 * high/critical, not on every tick a sustained high-risk period holds. Re-arms
 * once risk drops back below high, so a second escalation alerts again.
 */
export function shouldAlertBanRisk(
  currentRisk: BanRiskLevel | undefined,
  lastAlertedRisk: BanRiskLevel | undefined
): boolean {
  return isElevatedRisk(currentRisk) && !isElevatedRisk(lastAlertedRisk);
}

/** Writes one row per event to bot_health_log (see supabase/migrations/0001_bot_health_log.sql). */
export async function recordEvent(
  eventType: BotHealthEventType,
  detail: Record<string, unknown> = {}
): Promise<void> {
  logger.info({ eventType, ...detail }, "bot_health_log event");
  if (!client) return;

  const { error } = await client.from("bot_health_log").insert({
    event_type: eventType,
    detail,
    logged_at: new Date().toISOString(),
  });
  if (error) {
    logger.error({ err: error }, "failed to write bot_health_log event to Supabase");
  }
}

/**
 * Runs `onTick` on a fixed interval (Phase 1 heartbeat acceptance criterion: every
 * 5 minutes by default). The caller decides what a "tick" means — see
 * connection.ts's heartbeatTick(), which emits a `heartbeat` event every tick and
 * an edge-triggered `ban_suspected` event when baileys-antiban's risk crosses into
 * high/critical.
 */
export function startHeartbeatLoop(onTick: () => void): () => void {
  const interval = setInterval(onTick, config.health.heartbeatIntervalMs);
  return () => clearInterval(interval);
}
