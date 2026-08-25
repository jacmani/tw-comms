/**
 * Exponential backoff for reconnect attempts (Phase 1: "Reconnection logic with
 * exponential backoff"). Baileys' own `connection.update` event tells us *why* the
 * socket closed; we only back off on transient network-y closes, and stop entirely
 * on codes that mean "this session is dead, don't retry" (see shouldReconnect below).
 */

export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  factor?: number;
  jitterMs?: number;
}

export class ReconnectBackoff {
  private attempt = 0;
  private readonly baseMs: number;
  private readonly maxMs: number;
  private readonly factor: number;
  private readonly jitterMs: number;

  constructor(opts: BackoffOptions = {}) {
    this.baseMs = opts.baseMs ?? 2_000;
    this.maxMs = opts.maxMs ?? 5 * 60_000; // cap at 5 minutes
    this.factor = opts.factor ?? 2;
    this.jitterMs = opts.jitterMs ?? 1_000;
  }

  /** Call after a successful, stable connection (e.g. once "open" has held for a while). */
  reset(): void {
    this.attempt = 0;
  }

  /** Returns the delay (ms) to wait before the next reconnect attempt, and advances state. */
  next(): number {
    const raw = Math.min(this.maxMs, this.baseMs * this.factor ** this.attempt);
    this.attempt += 1;
    return raw + Math.floor(Math.random() * this.jitterMs);
  }

  get attemptCount(): number {
    return this.attempt;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
