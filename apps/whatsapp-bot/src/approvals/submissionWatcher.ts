import type { Notice } from "@tw-comms/shared";
import { getSupabaseClient } from "../supabase.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { SafeSocket } from "../connection.js";
import { formatNoticeMessage } from "./sender.js";

/**
 * Bridges Phase 3's (not-yet-built) compose screen to the WhatsApp approval flow
 * without coupling the bot to the dashboard directly: polls for notices the FM has
 * submitted (`status = 'pending_approval'`) that don't have a WhatsApp prompt
 * posted yet, posts the preview to the committee group (spec §5.3 step 2), and
 * records the resulting message id so reactions.ts can match votes back to it.
 * Forward-compatible — no changes needed here once Phase 3 actually writes
 * `pending_approval` rows.
 *
 * Not itself one of the named Phase 2 ClickUp tasks — added because
 * 86d44wjuc's reaction detection has nothing to react to without it. Flagged as a
 * gap in the ClickUp comment on that task.
 *
 * Explicitly NOT implemented here: the parallel Resend email approval channel from
 * spec §5.2. No live Phase 2 ClickUp task currently scopes it (the task list
 * dropped it relative to the earlier draft in 04-clickup-task-plan.md) — flagged
 * as a gap rather than built unprompted.
 */
const POLL_INTERVAL_MS = 15_000;

function formatApprovalPrompt(notice: Notice): string {
  return `${formatNoticeMessage(notice)}\n\n_React 👍 to approve or 👎 to reject._`;
}

export async function pollAndPostPendingApprovals(sock: SafeSocket): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !config.committeeGroupJid) return;

  const { data, error } = await client
    .from("notices")
    .select("*")
    .eq("status", "pending_approval")
    .is("whatsapp_prompt_message_id", null);

  if (error) {
    logger.error({ err: error }, "failed to poll for pending-approval notices");
    return;
  }

  for (const notice of (data ?? []) as Notice[]) {
    try {
      const sent = await sock.sendMessage(config.committeeGroupJid, {
        text: formatApprovalPrompt(notice),
      });
      const messageId = sent?.key?.id;
      if (!messageId) {
        logger.warn({ noticeId: notice.id }, "posted approval prompt but got no message id back");
        continue;
      }
      await client.from("notices").update({ whatsapp_prompt_message_id: messageId }).eq("id", notice.id);
      logger.info({ noticeId: notice.id, messageId }, "posted notice for committee approval");
    } catch (err) {
      logger.error({ err, noticeId: notice.id }, "failed to post approval prompt");
    }
  }
}

export function startSubmissionWatcher(sock: SafeSocket): () => void {
  const interval = setInterval(() => void pollAndPostPendingApprovals(sock), POLL_INTERVAL_MS);
  void pollAndPostPendingApprovals(sock);
  return () => clearInterval(interval);
}
