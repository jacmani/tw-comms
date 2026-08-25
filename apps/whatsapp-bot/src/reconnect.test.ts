import { test } from "node:test";
import assert from "node:assert/strict";
import { ReconnectBackoff } from "./reconnect.js";

test("backoff grows exponentially and is capped", () => {
  const backoff = new ReconnectBackoff({
    baseMs: 1000,
    factor: 2,
    maxMs: 8000,
    jitterMs: 0, // deterministic for this assertion
  });

  const delays = Array.from({ length: 6 }, () => backoff.next());

  assert.deepEqual(delays, [1000, 2000, 4000, 8000, 8000, 8000]);
  assert.equal(backoff.attemptCount, 6);
});

test("reset() returns the sequence to the first interval", () => {
  const backoff = new ReconnectBackoff({ baseMs: 1000, factor: 2, jitterMs: 0 });

  backoff.next();
  backoff.next();
  backoff.reset();

  assert.equal(backoff.attemptCount, 0);
  assert.equal(backoff.next(), 1000);
});

test("never returns a delay above maxMs + jitterMs, so reconnects can't tight-loop under sustained failure", () => {
  const backoff = new ReconnectBackoff({
    baseMs: 500,
    factor: 3,
    maxMs: 5 * 60_000,
    jitterMs: 1000,
  });

  for (let i = 0; i < 50; i += 1) {
    const delay = backoff.next();
    assert.ok(delay <= 5 * 60_000 + 1000, `attempt ${i} delay ${delay}ms exceeded cap`);
    assert.ok(delay >= 0);
  }
});
