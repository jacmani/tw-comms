import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateQuorum, requiresApproval } from "./quorum.js";

test("evaluateQuorum fails closed with an empty approver pool — never a trivial pass", () => {
  const result = evaluateQuorum(0, 0, 2);
  assert.deepEqual(result, { met: false, reason: "no_qualified_approvers" });
});

test("evaluateQuorum caps the requirement at pool size so a small committee isn't stuck", () => {
  // Only 1 possible approver exists for this category — configured quorum of 2
  // would otherwise be unsatisfiable forever.
  assert.deepEqual(evaluateQuorum(1, 1, 2), { met: true });
  assert.deepEqual(evaluateQuorum(0, 1, 2), {
    met: false,
    reason: "insufficient_approvals",
    have: 0,
    need: 1,
  });
});

test("evaluateQuorum requires the configured count when the pool is large enough", () => {
  assert.deepEqual(evaluateQuorum(1, 5, 2), {
    met: false,
    reason: "insufficient_approvals",
    have: 1,
    need: 2,
  });
  assert.deepEqual(evaluateQuorum(2, 5, 2), { met: true });
  assert.deepEqual(evaluateQuorum(3, 5, 2), { met: true });
});

test("requiresApproval is false only for the Emergency Alert bypass (empty required_roles)", () => {
  assert.equal(requiresApproval([]), false);
  assert.equal(requiresApproval(["president"]), true);
});
