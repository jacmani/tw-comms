import type { ApprovalAction, ApprovalChannel, Notice, NoticeCategory } from "@tw-comms/shared";
import { getSupabaseClient } from "../supabase.js";
import { logger } from "../logger.js";
import { countActiveApproversForRoles, getRequiredRoles } from "./allowlist.js";
import { evaluateQuorum } from "./quorum.js";
import { config } from "../config.js";
import type { SafeSocket } from "../connection.js";
import { sendApprovedNotice } from "./sender.js";

export async function getNoticeByPromptMessageId(messageId: string): Promise<Notice | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("notices")
    .select("*")
    .eq("whatsapp_prompt_message_id", messageId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, messageId }, "failed to look up notice by whatsapp_prompt_message_id");
    return null;
  }
  return (data as Notice | null) ?? null;
}

/** Upsert so an approver changing their mind (re-reacting) updates their one vote
 * for this round, rather than creating a duplicate — enforced at the DB level by
 * the unique (notice_id, approval_round, approver_id) index in
 * 0005_notice_approval_rounds.sql. Scoped to `approvalRound` so a prior
 * rejected-then-resubmitted round's votes never collide with or count toward the
 * current one (86d44wm6u). */
async function recordVote(
  noticeId: string,
  approvalRound: number,
  approverCommitteeMemberId: string,
  action: ApprovalAction,
  channel: ApprovalChannel
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from("notice_approvals").upsert(
    {
      notice_id: noticeId,
      approval_round: approvalRound,
      approver_id: approverCommitteeMemberId,
      action,
      channel,
      decided_at: new Date().toISOString(),
    },
    { onConflict: "notice_id,approval_round,approver_id" }
  );
  if (error) {
    logger.error({ err: error, noticeId, approverCommitteeMemberId }, "failed to record notice_approvals vote");
  }
}

async function countDistinctApprovals(noticeId: string, approvalRound: number): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const { count, error } = await client
    .from("notice_approvals")
    .select("id", { count: "exact", head: true })
    .eq("notice_id", noticeId)
    .eq("approval_round", approvalRound)
    .eq("action", "approved");

  if (error) {
    logger.error({ err: error, noticeId }, "failed to count notice_approvals");
    return 0;
  }
  return count ?? 0;
}

async function setNoticeStatus(noticeId: string, status: Notice["status"]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from("notices").update({ status }).eq("id", noticeId);
  if (error) {
    logger.error({ err: error, noticeId, status }, "failed to update notice status");
  }
}

interface ApproverIdentity {
  committeeMemberId: string;
  role: string;
}

/**
 * Applies one qualified approver's vote to a notice and, on approval, advances the
 * state machine: records the vote, checks quorum (ClickUp 86d44wm66 — PROVISIONAL
 * default, see quorum.ts), and on quorum met, moves the notice to `approved` and
 * triggers the send (86d44wm66's "auto-send on threshold met"). On rejection, a
 * single qualified reject is a veto (spec §5.1 gives approval authority to any one
 * of several roles; the same "any one" authority is treated as sufficient to
 * reject) — moves the notice straight to `rejected` (86d44wm6u picks up from there
 * for edit-and-resend).
 */
export async function applyVote(
  notice: Notice,
  approver: ApproverIdentity,
  action: ApprovalAction,
  channel: ApprovalChannel,
  sock: SafeSocket | null
): Promise<void> {
  if (notice.status !== "pending_approval") {
    logger.info(
      { noticeId: notice.id, status: notice.status },
      "vote received for a notice that isn't pending_approval — ignoring (already decided or not submitted)"
    );
    return;
  }

  await recordVote(notice.id, notice.approval_round, approver.committeeMemberId, action, channel);

  if (action === "rejected") {
    await setNoticeStatus(notice.id, "rejected");
    logger.info({ noticeId: notice.id, approver: approver.committeeMemberId }, "notice rejected");
    return;
  }

  const requiredRoles = (await getRequiredRoles(notice.category as NoticeCategory)) ?? [];
  const poolSize = await countActiveApproversForRoles(requiredRoles);
  const have = await countDistinctApprovals(notice.id, notice.approval_round);
  const result = evaluateQuorum(have, poolSize, config.approval.quorumCount);

  if (!result.met) {
    logger.info({ noticeId: notice.id, result }, "quorum not yet met");
    return;
  }

  await setNoticeStatus(notice.id, "approved");
  logger.info({ noticeId: notice.id }, "quorum met — notice approved, sending");

  if (!sock) {
    logger.warn(
      { noticeId: notice.id },
      "quorum met but no live socket to send with — notice stays 'approved', a future connect should pick it up"
    );
    return;
  }

  await sendApprovedNotice(sock, notice);
}
