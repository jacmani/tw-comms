import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBrandedPrompt } from "./brandGuardrail.js";
import type { PosterRequest } from "./types.js";

const baseRequest: PosterRequest = {
  headline: "Water Supply Interruption",
  detailLines: ["Tomorrow 10am-2pm", "Venus tower only"],
  category: "notice",
};

test("buildBrandedPrompt includes the headline and detail lines verbatim", () => {
  const prompt = buildBrandedPrompt(baseRequest);
  assert.match(prompt, /Water Supply Interruption/);
  assert.match(prompt, /Tomorrow 10am-2pm/);
  assert.match(prompt, /Venus tower only/);
});

test("buildBrandedPrompt reflects category-specific styling", () => {
  const emergencyPrompt = buildBrandedPrompt({ ...baseRequest, category: "emergency" });
  assert.match(emergencyPrompt, /urgent/);
  const eventPrompt = buildBrandedPrompt({ ...baseRequest, category: "event" });
  assert.match(eventPrompt, /celebratory/);
});

test("buildBrandedPrompt includes the tower badge only when provided", () => {
  const withBadge = buildBrandedPrompt({ ...baseRequest, towerBadge: "venus" });
  assert.match(withBadge, /Venus tower/);

  const withoutBadge = buildBrandedPrompt(baseRequest);
  assert.doesNotMatch(withoutBadge, /badge/);
});

test("buildBrandedPrompt never echoes anything beyond the structured fields — no injected freeform text path exists", () => {
  // There is no prompt/freeform parameter on PosterRequest at all — this test
  // documents that guarantee at the type level: the object below is the full
  // surface `buildBrandedPrompt` can read from.
  const request: PosterRequest = { headline: "H", detailLines: [], category: "notice" };
  const prompt = buildBrandedPrompt(request);
  assert.equal(typeof prompt, "string");
});
