import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { wrapSocket, type BanRiskLevel } from "baileys-antiban";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { ReconnectBackoff, sleep } from "./reconnect.js";
import { recordEvent, startHeartbeatLoop, shouldAlertBanRisk, type BotStatus } from "./health.js";
import { handleCommitteeReaction } from "./approvals/reactions.js";
import { startSubmissionWatcher } from "./approvals/submissionWatcher.js";

// baileys-antiban doesn't export its WASocket interface publicly — derive it from
// wrapSocket's own parameter type instead of re-declaring a parallel shape here.
type AntibanSocket = Parameters<typeof wrapSocket>[0];

export type SafeSocket = ReturnType<typeof wrapSocket>;

interface StartOptions {
  /** Called once per new/updated QR code (base64 PNG data URL) so callers can display it. */
  onQr?: (dataUrl: string) => void;
  /** Called once the socket reaches "open" for the first time this run. */
  onReady?: (sock: SafeSocket) => void;
}

/**
 * Owns the Baileys socket lifecycle: pairing, auth persistence, reconnection with
 * backoff, and anti-ban wrapping. This is Phase 1's "base connection + auth state
 * persistence" + "reconnection logic" + "integrate baileys-antiban" tasks combined,
 * since they share one state machine and splitting them into separate modules that
 * each reach into the socket would just recreate the same coupling with extra steps.
 */
export class BotConnection {
  private status: BotStatus = "connecting";
  private backoff = new ReconnectBackoff();
  private sock: SafeSocket | null = null;
  private stopHeartbeat: (() => void) | null = null;
  private stopSubmissionWatcher: (() => void) | null = null;
  private stopped = false;
  // Edge-triggers ban_suspected so a sustained high-risk period logs one alert, not
  // one every heartbeat interval — re-arms once risk drops back below "high".
  private lastAlertedRisk: BanRiskLevel | null = null;

  constructor(private opts: StartOptions = {}) {}

  getStatus(): BotStatus {
    return this.status;
  }

  getSocket(): SafeSocket | null {
    return this.sock;
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.stopHeartbeat = startHeartbeatLoop(() => this.heartbeatTick());
    await this.connect();
  }

  private heartbeatTick(): void {
    if (!this.sock) {
      void recordEvent("heartbeat", { connectionStatus: this.status });
      return;
    }

    const { warmUp, health } = this.sock.antiban.getStats();

    if (shouldAlertBanRisk(health.risk, this.lastAlertedRisk ?? undefined)) {
      logger.error({ health }, "baileys-antiban reports elevated ban risk");
      void recordEvent("ban_suspected", {
        connectionStatus: this.status,
        risk: health.risk,
        score: health.score,
        reasons: health.reasons,
        recommendation: health.recommendation,
      });
    }
    this.lastAlertedRisk = health.risk;

    void recordEvent("heartbeat", { connectionStatus: this.status, warmUp, health });
  }

  stop(): void {
    this.stopped = true;
    this.stopHeartbeat?.();
    this.stopSubmissionWatcher?.();
    this.sock?.end(undefined);
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(
      config.authStateDir
    );
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ version, isLatest }, "using Baileys version");

    const rawSock = makeWASocket({
      version,
      auth: state,
      logger: logger.child({ module: "baileys" }),
      // Printing our own QR (see onQr below) instead of Baileys' terminal QR so the
      // cloud/host environment doesn't need a TTY that supports ASCII QR rendering.
      printQRInTerminal: false,
    });

    this.sock = wrapSocket(
      // baileys-antiban's WASocket type declares groupParticipantsUpdate with a plain
      // `string` action param, narrower than Baileys' own ParticipantAction union —
      // the runtime shape is compatible, this is purely the two libraries' declared
      // types disagreeing on an optional method neither of us calls through the
      // wrapper's type.
      rawSock as unknown as AntibanSocket,
      {
        maxPerMinute: config.antiban.maxPerMinute,
        maxPerHour: config.antiban.maxPerHour,
        maxPerDay: config.antiban.maxPerDay,
        // 7-day warm-up ramp is on by default; growthFactor is deliberately left
        // unset — a fixed value would make every bot on this library follow the
        // identical daily curve, which is itself a cross-account fingerprint.
        warmupDays: 7,
        persist: config.antiban.statePath,
        logging: true,
      },
      undefined,
      {
        // WA's observed unofficial limits (see baileys-antiban's own
        // groupOperationGuard docs) — explicit here rather than relying on the
        // library default so the Phase 1 acceptance number is visible in code.
        groupOpGuard: {
          limits: {
            add: { max: 3, windowMs: 10 * 60_000 },
            create: { max: 2, windowMs: 10 * 60_000 },
          },
        },
      }
    );

    rawSock.ev.on("creds.update", saveCreds);

    rawSock.ev.on("connection.update", (update) => {
      void this.handleConnectionUpdate(update);
    });

    // ClickUp 86d44wjuc — committee approval/rejection via 👍/👎 reactions.
    rawSock.ev.on("messages.reaction", (updates) => {
      for (const update of updates) {
        if (this.sock) void handleCommitteeReaction(update, this.sock);
      }
    });
  }

  private async handleConnectionUpdate(update: {
    connection?: "close" | "connecting" | "open";
    lastDisconnect?: { error?: Error };
    qr?: string;
  }): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("QR code received — scan with WhatsApp > Linked Devices");
      const dataUrl = await qrcode.toDataURL(qr);
      this.opts.onQr?.(dataUrl);
    }

    if (connection === "connecting") {
      this.status = "connecting";
    }

    if (connection === "open") {
      const wasRecovering = this.backoff.attemptCount > 0;
      this.status = "open";
      this.backoff.reset();
      const { warmUp, health } = this.sock!.antiban.getStats();
      logger.info({ warmUp, health }, "antiban state after connect");
      // "reconnect" only when this open follows a prior disconnect — the very
      // first connection of a run isn't a recovery, it's just startup, and the
      // periodic heartbeat loop covers that case within one interval.
      if (wasRecovering) {
        await recordEvent("reconnect", { connectionStatus: "open", warmUp, health });
      }
      this.stopSubmissionWatcher?.();
      this.stopSubmissionWatcher = startSubmissionWatcher(this.sock!);
      this.opts.onReady?.(this.sock!);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      this.stopSubmissionWatcher?.();
      this.stopSubmissionWatcher = null;

      if (loggedOut) {
        this.status = "closed";
        await recordEvent("disconnect", {
          connectionStatus: "closed",
          statusCode,
          loggedOut: true,
          retrying: false,
        });
        logger.error(
          "Session logged out (device removed from WhatsApp Linked Devices). " +
            `Delete ${config.authStateDir} and re-run to pair again. Not retrying.`
        );
        return;
      }

      if (this.stopped) {
        this.status = "closed";
        await recordEvent("disconnect", {
          connectionStatus: "closed",
          statusCode,
          loggedOut: false,
          retrying: false,
        });
        return;
      }

      this.status = "reconnecting";
      const delay = this.backoff.next();
      logger.warn(
        { statusCode, delayMs: delay, attempt: this.backoff.attemptCount },
        "connection closed, reconnecting with backoff"
      );
      await recordEvent("disconnect", {
        connectionStatus: "reconnecting",
        statusCode,
        loggedOut: false,
        retrying: true,
        retryDelayMs: delay,
        attempt: this.backoff.attemptCount,
      });
      await sleep(delay);
      if (!this.stopped) await this.connect();
    }
  }
}
