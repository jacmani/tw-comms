import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { wrapSocket } from "baileys-antiban";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { ReconnectBackoff, sleep } from "./reconnect.js";
import { recordHeartbeat, startHeartbeatLoop, type BotStatus } from "./health.js";

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
  private stopped = false;

  constructor(private opts: StartOptions = {}) {}

  getStatus(): BotStatus {
    return this.status;
  }

  getSocket(): SafeSocket | null {
    return this.sock;
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.stopHeartbeat = startHeartbeatLoop(
      () => this.status,
      () => {
        if (!this.sock) return {};
        const { warmUp, health } = this.sock.antiban.getStats();
        return { warmUp, health };
      }
    );
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.stopHeartbeat?.();
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
      this.status = "open";
      this.backoff.reset();
      const { warmUp, health } = this.sock!.antiban.getStats();
      logger.info({ warmUp, health }, "antiban state after connect");
      await recordHeartbeat("open", {
        attempt: this.backoff.attemptCount,
        warmUp,
        health,
      });
      this.opts.onReady?.(this.sock!);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      await recordHeartbeat("closed", { statusCode, loggedOut });

      if (loggedOut) {
        logger.error(
          "Session logged out (device removed from WhatsApp Linked Devices). " +
            `Delete ${config.authStateDir} and re-run to pair again. Not retrying.`
        );
        return;
      }

      if (this.stopped) return;

      this.status = "reconnecting";
      const delay = this.backoff.next();
      logger.warn(
        { statusCode, delayMs: delay, attempt: this.backoff.attemptCount },
        "connection closed, reconnecting with backoff"
      );
      await recordHeartbeat("reconnecting", { statusCode, delayMs: delay });
      await sleep(delay);
      if (!this.stopped) await this.connect();
    }
  }
}
