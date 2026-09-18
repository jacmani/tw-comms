import { test } from "node:test";
import assert from "node:assert/strict";
import { requiresMandatoryReview } from "./moderation.js";

test("requiresMandatoryReview is false when there's no generated image", () => {
  assert.equal(requiresMandatoryReview(false, "notice"), false);
  assert.equal(requiresMandatoryReview(false, "emergency"), false);
});

test("requiresMandatoryReview is true for a generated image on a normal category", () => {
  assert.equal(requiresMandatoryReview(true, "notice"), true);
  assert.equal(requiresMandatoryReview(true, "advertisement"), true);
});

test("requiresMandatoryReview is true even for Emergency Alerts — a generated image forces review despite the category's normal approval bypass (flagged as a judgment call, see code comment)", () => {
  assert.equal(requiresMandatoryReview(true, "emergency"), true);
});
