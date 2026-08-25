import { test } from "node:test";
import assert from "node:assert/strict";
import { AntiBan } from "baileys-antiban";

/**
 * Offline proxy for the Phase 1 antiban acceptance criterion "rapid-fire send
 * attempt gets throttled, not sent instantly" — exercises the same beforeSend()
 * decision path connection.ts's wrapSocket() calls under the hood, without needing
 * a live WhatsApp pairing.
 */
test("rapid-fire sends past the burst allowance are throttled or blocked, not all allowed instantly", async () => {
  const antiban = new AntiBan({
    maxPerMinute: 3,
    burstAllowance: 1,
    minDelayMs: 500,
    maxDelayMs: 1500,
    newChatDelayMs: 0,
    logging: false,
  });

  const decisions = [];
  for (let i = 0; i < 6; i += 1) {
    const decision = await antiban.beforeSend("2712345678@s.whatsapp.net", `test message ${i}`);
    decisions.push(decision);
    if (decision.allowed) antiban.afterSend("2712345678@s.whatsapp.net", `test message ${i}`);
  }

  const throttledOrBlocked = decisions.filter((d) => d.delayMs > 0 || !d.allowed);
  assert.ok(
    throttledOrBlocked.length > 0,
    "expected at least one send past the burst allowance to be delayed or blocked"
  );

  const everythingInstant = decisions.every((d) => d.allowed && d.delayMs === 0);
  assert.ok(!everythingInstant, "all 6 rapid sends were allowed with zero delay — throttling did not engage");
});
