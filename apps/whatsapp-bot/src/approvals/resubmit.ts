import type { Notice } from "@tw-comms/shared";
import { getSupabaseClient } from "../supabase.js";
import { logger } from "../logger.js";

export type NoticeEdits = Partial<Pick<Notice, "title" | "body" | "image_url" | "target_groups">>;

/**
 * "Rejection + edit-and-resend flow" (ClickUp 86d44wm6u): only a `rejected` notice
 * can be resubmitted (spec §5.3: "Rejection → back to draft"). Bumps
 * `approval_round` so the fresh cycle's votes don't inherit the previous round's
 * rejection or any partial approvals (see 0005_notice_approval_rounds.sql), and
 * clears `whatsapp_prompt_message_id` so submissionWatcher.ts posts a new prompt
 * for the edited content instead of reusing the old (now-stale) one.
 *
 * This is the backend half of the flow — the FM-facing "edit and resubmit" button
 * belongs to Phase 3's compose screen, which doesn't exist yet; that screen should
 * call this same update shape (increment approval_round, clear the prompt id, set
 * status to pending_approval) from its own server action rather than duplicating
 * the logic, once it's built.
 */
export async function resubmitNotice(noticeId: string, edits: NoticeEdits): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { data: notice, error: fetchError } = await client
    .from("notices")
    .select("*")
    .eq("id", noticeId)
    .maybeSingle();

  if (fetchError || !notice) {
    logger.error({ err: fetchError, noticeId }, "resubmitNotice: notice not found");
    return false;
  }
  if ((notice as Notice).status !== "rejected") {
    logger.warn(
      { noticeId, status: (notice as Notice).status },
      "resubmitNotice: only a rejected notice can be edited and resubmitted"
    );
    return false;
  }

  const { error } = await client
    .from("notices")
    .update({
      ...edits,
      status: "pending_approval",
      approval_round: (notice as Notice).approval_round + 1,
      whatsapp_prompt_message_id: null,
    })
    .eq("id", noticeId);

  if (error) {
    logger.error({ err: error, noticeId }, "resubmitNotice: update failed");
    return false;
  }
  return true;
}
