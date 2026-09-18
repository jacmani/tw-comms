import type { SupabaseClient } from "@supabase/supabase-js";

export type TrafficLight = "green" | "amber" | "red";

export interface BotHealthSummary {
  light: TrafficLight;
  label: string;
  lastEventAt: string | null;
  lastEventType: string | null;
  connectionStatus: string | null;
}

const RED_AFTER_MS = 15 * 60_000; // spec §4.4: red if down >15 min

/**
 * Bot Status traffic light (spec §4.4/§3.7) — derived from the latest
 * bot_health_log row rather than a stored "current status" column, since the row
 * IS the source of truth and storing a derived copy would just be another place
 * for staleness to hide.
 */
export async function getBotHealthSummary(supabase: SupabaseClient): Promise<BotHealthSummary> {
  const { data, error } = await supabase
    .from("bot_health_log")
    .select("event_type, detail, logged_at")
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { light: "red", label: "No bot activity recorded yet", lastEventAt: null, lastEventType: null, connectionStatus: null };
  }

  const ageMs = Date.now() - new Date(data.logged_at).getTime();
  const connectionStatus = (data.detail as Record<string, unknown> | null)?.connectionStatus as string | undefined;

  if (data.event_type === "ban_suspected") {
    return {
      light: "red",
      label: "Elevated ban risk detected — check Bot Status for detail",
      lastEventAt: data.logged_at,
      lastEventType: data.event_type,
      connectionStatus: connectionStatus ?? null,
    };
  }

  if (ageMs > RED_AFTER_MS || connectionStatus === "closed") {
    return {
      light: "red",
      label: "Disconnected — notices are not sending",
      lastEventAt: data.logged_at,
      lastEventType: data.event_type,
      connectionStatus: connectionStatus ?? null,
    };
  }

  if (connectionStatus === "reconnecting" || connectionStatus === "connecting") {
    return {
      light: "amber",
      label: "Reconnecting…",
      lastEventAt: data.logged_at,
      lastEventType: data.event_type,
      connectionStatus,
    };
  }

  return {
    light: "green",
    label: "Connected and healthy",
    lastEventAt: data.logged_at,
    lastEventType: data.event_type,
    connectionStatus: connectionStatus ?? null,
  };
}
