import { test } from "node:test";
import assert from "node:assert/strict";
import { isElevatedRisk, shouldAlertBanRisk } from "./health.js";

/**
 * Offline proxy for the "ban_suspected wired to baileys-antiban's risk score"
 * acceptance criterion (ClickUp 86d45pbj8) — exercises the edge-trigger decision
 * connection.ts's heartbeatTick() calls, without needing a live socket.
 */
test("isElevatedRisk treats only high/critical as elevated", () => {
  assert.equal(isElevatedRisk("low"), false);
  assert.equal(isElevatedRisk("medium"), false);
  assert.equal(isElevatedRisk("high"), true);
  assert.equal(isElevatedRisk("critical"), true);
  assert.equal(isElevatedRisk(undefined), false);
});

test("shouldAlertBanRisk fires once on escalation, not on every tick while sustained", () => {
  // low -> high: alert
  assert.equal(shouldAlertBanRisk("high", "low"), true);
  // high -> high (already alerted): stay quiet
  assert.equal(shouldAlertBanRisk("high", "high"), false);
  // high -> critical (already alerted at high): still elevated, don't re-alert
  assert.equal(shouldAlertBanRisk("critical", "high"), false);
});

test("shouldAlertBanRisk re-arms after risk drops back below high", () => {
  // high -> medium: risk recedes, no alert (nothing to alert about)
  assert.equal(shouldAlertBanRisk("medium", "high"), false);
  // medium -> high again after having receded: alert again
  assert.equal(shouldAlertBanRisk("high", "medium"), true);
});
