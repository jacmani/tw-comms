import type { BaileysEventMap } from "@whiskeysockets/baileys";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { resolveApprover, getRequiredRoles, isQualifiedApprover } from "./allowlist.js";
import { getNoticeByPromptMessageId, applyVote } from "./pipeline.js";
import type { SafeSocket } from "../connection.js";

export type ReactionOutcome = "approved" | "rejected" | "ignored";

/** 👍 approves, 👎 rejects — per CLAUDE.md's flow description. A removed reaction
 * arrives with a falsy `text` (Baileys' own doc comment on messages.reaction) and
 * is treated as "ignored", not as retracting a prior vote — retraction isn't in
 * scope for this task; flagged in the ClickUp comment. */
export function classifyReactionEmoji(emoji: string | null | undefined): ReactionOutcome {
  if (emoji === "\u{1F44D}") return "approved"; // 👍
  if (emoji === "\u{1F44E}") return "rejected"; // 👎
  return "ignored";
}

type ReactionEvent = BaileysEventMap["messages.reaction"][number];

/**
 * "Bot detects approval/rejection replies in the committee group" (ClickUp
 * 86d44wjuc). Wire this to `rawSock.ev.on("messages.reaction", ...)` alongside the
 * other listeners in connection.ts once the bot is ready.
 */
export async function handleCommitteeReaction(update: ReactionEvent, sock: SafeSocket): Promise<void> {
  if (!config.committeeGroupJid || update.key.remoteJid !== config.committeeGroupJid) return;

  const outcome = classifyReactionEmoji(update.reaction.text);
  if (outcome === "ignored") return;

  const reactorJid = update.key.participant || update.key.remoteJid;
  const promptMessageId = update.key.id;
  if (!reactorJid || !promptMessageId) return;

  const notice = await getNoticeByPromptMessageId(promptMessageId);
  if (!notice) {
    logger.debug({ promptMessageId }, "reaction on a message that isn't a tracked notice prompt — ignoring");
    return;
  }

  const [approver, requiredRoles] = await Promise.all([
    resolveApprover(reactorJid),
    getRequiredRoles(notice.category),
  ]);

  if (!isQualifiedApprover(approver, requiredRoles ?? [])) {
    logger.info(
      { reactorJid, noticeId: notice.id, role: approver?.role ?? null },
      "reaction from a non-qualified or non-allowlisted sender — ignoring"
    );
    return;
  }

  await applyVote(
    notice,
    { committeeMemberId: approver!.committee_member_id, role: approver!.role },
    outcome,
    "whatsapp_group",
    sock
  );
}
