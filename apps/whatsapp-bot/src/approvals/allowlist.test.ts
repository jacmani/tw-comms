import { test } from "node:test";
import assert from "node:assert/strict";
import { isQualifiedApprover } from "./allowlist.js";

test("isQualifiedApprover fails closed when approver is null (not on the allowlist)", () => {
  assert.equal(isQualifiedApprover(null, ["president", "secretary"]), false);
});

test("isQualifiedApprover fails closed for an allowlisted but deactivated approver", () => {
  assert.equal(
    isQualifiedApprover({ role: "president", is_active: false }, ["president"]),
    false
  );
});

test("isQualifiedApprover fails closed when the approver's role isn't in required_roles", () => {
  assert.equal(
    isQualifiedApprover({ role: "tower_gc_chair", is_active: true }, ["president", "secretary"]),
    false
  );
});

test("isQualifiedApprover passes when role matches and approver is active", () => {
  assert.equal(
    isQualifiedApprover({ role: "secretary", is_active: true }, ["president", "secretary"]),
    true
  );
});
