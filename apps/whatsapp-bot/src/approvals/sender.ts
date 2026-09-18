import type { Notice, NoticeTarget } from "@tw-comms/shared";
import { getSupabaseClient } from "../supabase.js";
import { logger } from "../logger.js";
import type { SafeSocket } from "../connection.js";

/** Plain-text rendering of a notice for WhatsApp send — poster image (if any) is
 * attached separately once Phase 4's image pipeline exists; this covers the
 * text-only path every notice has today. */
export function formatNoticeMessage(notice: Notice): string {
  return `*${notice.title}*\n\n${notice.body}`;
}

async function recordSendResult(
  noticeId: string,
  target: NoticeTarget,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from("notice_sends").insert({
    notice_id: noticeId,
    target_type: target.target_type,
    target_id: target.target_id,
    target_name: target.target_name,
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    error_message: errorMessage ?? null,
  });
  if (error) {
    logger.error({ err: error, noticeId, target }, "failed to record notice_sends row");
  }
}

/**
 * "Auto-send on threshold met" (ClickUp 86d44wm66) — sends an approved notice to
 * every WhatsApp target, paced by baileys-antiban (sock.sendMessage() is already
 * antiban-wrapped, see connection.ts). MyGate targets are never sent here — spec
 * §4.3 keeps MyGate a manual copy-paste step; they're recorded as `queued` so the
 * dashboard's "remember to post to MyGate" reminder has something to point at.
 */
export async function sendApprovedNotice(sock: SafeSocket, notice: Notice): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.from("notices").update({ status: "sending" }).eq("id", notice.id);
  }

  const text = formatNoticeMessage(notice);
  let anyFailed = false;

  for (const target of notice.target_groups) {
    if (target.target_type === "mygate_manual") {
      await recordSendResult(notice.id, target, "sent"); // "sent" here means "queued for the FM's manual step", see note above — mygate_posted tracks the real completion
      continue;
    }

    try {
      await sock.sendMessage(target.target_id, { text });
      await recordSendResult(notice.id, target, "sent");
    } catch (err) {
      anyFailed = true;
      logger.error({ err, noticeId: notice.id, target }, "notice send failed");
      await recordSendResult(notice.id, target, "failed", err instanceof Error ? err.message : String(err));
    }
  }

  if (client) {
    await client.from("notices").update({ status: anyFailed ? "failed" : "sent" }).eq("id", notice.id);
  }
}
