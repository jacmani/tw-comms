import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { logger } from "./logger.js";

export type BotStatus = "connecting" | "open" | "reconnecting" | "closed";

let client: SupabaseClient | null = null;
if (config.supabase.url && config.supabase.serviceRoleKey) {
  client = createClient(config.supabase.url, config.supabase.serviceRoleKey);
} else {
  logger.warn(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — health heartbeats will only log locally, not persist. Fine for local pairing tests, not for the hosted bot."
  );
}

/** Writes one row per heartbeat to bot_health_log (see supabase/migrations/0001_bot_health_log.sql). */
export async function recordHeartbeat(
  status: BotStatus,
  detail: Record<string, unknown> = {}
): Promise<void> {
  logger.info({ status, ...detail }, "heartbeat");
  if (!client) return;

  const { error } = await client.from("bot_health_log").insert({
    status,
    detail,
    recorded_at: new Date().toISOString(),
  });
  if (error) {
    logger.error({ err: error }, "failed to write heartbeat to Supabase");
  }
}

export function startHeartbeatLoop(
  getStatus: () => BotStatus,
  getDetail: () => Record<string, unknown> = () => ({})
): () => void {
  const interval = setInterval(() => {
    void recordHeartbeat(getStatus(), getDetail());
  }, config.health.heartbeatIntervalMs);
  return () => clearInterval(interval);
}
