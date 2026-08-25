import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return v;
}

export const config = {
  authStateDir: optional("BOT_AUTH_STATE_DIR", "./auth_state"),
  committeeGroupJid: optional("COMMITTEE_GROUP_JID"),
  announcementsJid: optional("ANNOUNCEMENTS_JID"),

  supabase: {
    // Health logging is optional in local dev — connection.ts no-ops if these are unset,
    // so you can run the bot without Supabase credentials while just testing pairing.
    url: optional("SUPABASE_URL"),
    serviceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  },

  antiban: {
    maxPerMinute: Number(optional("ANTIBAN_MAX_PER_MINUTE", "15")),
    maxPerHour: Number(optional("ANTIBAN_MAX_PER_HOUR", "400")),
    maxPerDay: Number(optional("ANTIBAN_MAX_PER_DAY", "2000")),
    // Warm-up ramp + rate-limiter counters persist here so a reconnect or process
    // restart doesn't reset day-1 of the 7-day warm-up (wrapSocket() is called fresh
    // on every reconnect in connection.ts — without this the ramp would silently
    // restart on every network blip).
    statePath: optional("ANTIBAN_STATE_FILE", "./antiban-state.json"),
  },

  health: {
    // 5 minutes per the Phase 1 heartbeat acceptance criteria.
    heartbeatIntervalMs: Number(
      optional("HEALTH_HEARTBEAT_INTERVAL_MS", "300000")
    ),
  },
};

export { required };
