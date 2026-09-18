import type { ApprovalAction, ApprovalChannel, AuditTrailRow, NoticeCategory } from "@tw-comms/shared";
import { getSupabaseClient } from "../supabase.js";
import { logger } from "../logger.js";

interface NoticeApprovalJoinRow {
  notice_id: string;
  approver_id: string;
  action: ApprovalAction;
  channel: ApprovalChannel;
  comment: string | null;
  decided_at: string;
  notices: { title: string; category: NoticeCategory } | null;
}

interface ApproverAllowlistLookupRow {
  committee_member_id: string;
  display_name: string;
  role: string;
}

/**
 * "Approval audit trail / export" (ClickUp 86d44wm7b) — who approved/rejected
 * what, when, and via which channel. Phase 3's dashboard will build the same shape
 * from its own (RLS-scoped) Supabase client; formatAuditTrailCsv in
 * @tw-comms/shared is the part actually shared between the two.
 *
 * Two queries + an in-memory join rather than a single PostgREST embedded select:
 * notice_approvals.approver_id and approver_allowlist.committee_member_id are
 * sibling foreign keys into committee_members, not a direct FK between the two
 * tables PostgREST could traverse in one call.
 */
export async function getAuditTrail(filters: { noticeId?: string } = {}): Promise<AuditTrailRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  let query = client
    .from("notice_approvals")
    .select("notice_id, approver_id, action, channel, comment, decided_at, notices(title, category)")
    .order("decided_at", { ascending: false });

  if (filters.noticeId) query = query.eq("notice_id", filters.noticeId);

  const { data, error } = await query;
  if (error) {
    logger.error({ err: error }, "failed to query audit trail");
    return [];
  }

  const rows = (data ?? []) as unknown as NoticeApprovalJoinRow[];
  const approverIds = [...new Set(rows.map((r) => r.approver_id))];
  const approversById = new Map<string, { display_name: string; role: string }>();

  if (approverIds.length > 0) {
    const { data: approvers, error: approversError } = await client
      .from("approver_allowlist")
      .select("committee_member_id, display_name, role")
      .in("committee_member_id", approverIds);

    if (approversError) {
      logger.error({ err: approversError }, "failed to look up approvers for audit trail");
    } else {
      for (const a of (approvers ?? []) as ApproverAllowlistLookupRow[]) {
        approversById.set(a.committee_member_id, { display_name: a.display_name, role: a.role });
      }
    }
  }

  return rows.map((row): AuditTrailRow => {
    const approver = approversById.get(row.approver_id);
    return {
      notice_id: row.notice_id,
      notice_title: row.notices?.title ?? "(deleted notice)",
      notice_category: row.notices?.category ?? "notice",
      approver_display_name: approver?.display_name ?? "(removed from allowlist)",
      approver_role: approver?.role ?? "",
      action: row.action,
      channel: row.channel,
      comment: row.comment,
      decided_at: row.decided_at,
    };
  });
}
