import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyReactionEmoji } from "./reactions.js";

test("classifyReactionEmoji recognizes thumbs up as approval", () => {
  assert.equal(classifyReactionEmoji("\u{1F44D}"), "approved");
});

test("classifyReactionEmoji recognizes thumbs down as rejection", () => {
  assert.equal(classifyReactionEmoji("\u{1F44E}"), "rejected");
});

test("classifyReactionEmoji ignores every other emoji and a removed reaction (falsy text)", () => {
  assert.equal(classifyReactionEmoji("\u{2764}"), "ignored"); // ❤️
  assert.equal(classifyReactionEmoji(""), "ignored");
  assert.equal(classifyReactionEmoji(null), "ignored");
  assert.equal(classifyReactionEmoji(undefined), "ignored");
});
