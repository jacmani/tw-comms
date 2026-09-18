import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { logger } from "./logger.js";

let client: SupabaseClient | null | undefined;
let warned = false;

/**
 * Lazily-created, memoized service-role Supabase client. Returns null (and warns
 * once) when credentials aren't set, so every caller can no-op gracefully in local
 * dev instead of throwing — same posture health.ts established in Phase 1.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  if (config.supabase.url && config.supabase.serviceRoleKey) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  } else {
    if (!warned) {
      logger.warn(
        "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Supabase-backed features will no-op locally."
      );
      warned = true;
    }
    client = null;
  }
  return client;
}
