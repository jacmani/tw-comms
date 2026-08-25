import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { wrapSocket } from "baileys-antiban";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { ReconnectBackoff, sleep } from "./reconnect.js";
import { recordHeartbeat, startHeartbeatLoop, type BotStatus } from "./health.js";

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
    this.stopHeartbeat = startHeartbeatLoop(() => this.status);
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

    this.sock = wrapSocket(rawSock, {
      maxPerMinute: config.antiban.maxPerMinute,
      maxPerHour: config.antiban.maxPerHour,
      maxPerDay: config.antiban.maxPerDay,
      logging: true,
    });

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
      await recordHeartbeat("open", { attempt: this.backoff.attemptCount });
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
