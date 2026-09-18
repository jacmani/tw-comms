import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldAlertOnUsage } from "./costTracking.js";

test("shouldAlertOnUsage is false below the threshold", () => {
  assert.equal(shouldAlertOnUsage(5, 100, 0.8), false);
});

test("shouldAlertOnUsage is true at or above the threshold", () => {
  assert.equal(shouldAlertOnUsage(80, 100, 0.8), true);
  assert.equal(shouldAlertOnUsage(95, 100, 0.8), true);
});

test("shouldAlertOnUsage never alerts when there's no known quota", () => {
  assert.equal(shouldAlertOnUsage(1000, 0, 0.8), false);
});
