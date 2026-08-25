import pino from "pino";

// Baileys requires a pino-compatible logger instance. Kept at "info" by default;
// bump to "debug" when diagnosing a reconnect loop.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});
