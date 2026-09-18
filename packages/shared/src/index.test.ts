import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAuditTrailCsv, type AuditTrailRow } from "./index.js";

const baseRow: AuditTrailRow = {
  notice_id: "n1",
  notice_title: "Water outage notice",
  notice_category: "notice",
  approver_display_name: "Jane Secretary",
  approver_role: "secretary",
  action: "approved",
  channel: "whatsapp_group",
  comment: null,
  decided_at: "2026-09-19T10:00:00.000Z",
};

test("formatAuditTrailCsv emits a header row and one data row per entry", () => {
  const csv = formatAuditTrailCsv([baseRow]);
  const lines = csv.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^notice_id,notice_title,notice_category/);
  assert.match(lines[1], /^n1,Water outage notice,notice,Jane Secretary,secretary,approved,whatsapp_group,,2026-09-19T10:00:00\.000Z$/);
});

test("formatAuditTrailCsv quotes fields containing commas, quotes, or newlines", () => {
  const csv = formatAuditTrailCsv([
    { ...baseRow, comment: 'Needs a re-word, and check the "date" line\nbefore resend' },
  ]);
  const dataLine = csv.split("\n").slice(1).join("\n");
  assert.ok(dataLine.includes('"Needs a re-word, and check the ""date"" line\nbefore resend"'));
});

test("formatAuditTrailCsv renders null comment as an empty field, not the string \"null\"", () => {
  const csv = formatAuditTrailCsv([baseRow]);
  assert.ok(!csv.includes("null"));
});
