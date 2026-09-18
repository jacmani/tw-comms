/** Baileys connection state — distinct from bot_health_log's event_type, see below. */
export type BotStatus = "connecting" | "open" | "reconnecting" | "closed";

/** Matches 01-specification.md §4.5's event_type enum (ClickUp 86d45pbj8). */
export type BotHealthEventType = "heartbeat" | "disconnect" | "reconnect" | "ban_suspected";

export interface BotHealthLogRow {
  id?: string;
  event_type: BotHealthEventType;
  detail: Record<string, unknown>;
  logged_at: string;
}

// ---- Phase 2 (Approval Workflow) ----

export type NoticeCategory = "notice" | "advertisement" | "emergency" | "event";
export type NoticeStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sending"
  | "sent"
  | "failed"
  | "rejected";

export interface NoticeTemplate {
  id: string;
  name: string;
  category: NoticeCategory;
  body_template: string;
  default_image_template_id: string | null;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
}

export type NoticeSendTargetType = "whatsapp_group" | "whatsapp_channel" | "mygate_manual";

/** One send destination, chosen at compose time — mirrors notice_sends' target_* columns
 * 1:1 so a notice's intent (target_groups) and its actual per-target outcomes line up. */
export interface NoticeTarget {
  target_type: NoticeSendTargetType;
  target_id: string; // WhatsApp JID, or a fixed sentinel ("mygate") for the manual-paste reminder
  target_name: string;
}

export interface Notice {
  id: string;
  template_id: string | null;
  title: string;
  body: string;
  image_url: string | null;
  category: NoticeCategory;
  target_groups: NoticeTarget[];
  status: NoticeStatus;
  created_by: string | null;
  created_at: string;
  mygate_posted: boolean;
  mygate_posted_at: string | null;
  whatsapp_prompt_message_id: string | null;
  // Bumped on every edit-and-resend (ClickUp 86d44wm6u) so notice_approvals votes
  // from a rejected round don't carry over and bias the resubmitted round, while
  // still being kept (not deleted) for the audit trail.
  approval_round: number;
}

export interface ApprovalRule {
  id: string;
  category: NoticeCategory;
  required_roles: string[];
}

export type ApprovalAction = "approved" | "rejected";
export type ApprovalChannel = "email" | "whatsapp_group";

export interface NoticeApproval {
  id: string;
  notice_id: string;
  approval_round: number;
  approver_id: string;
  action: ApprovalAction;
  channel: ApprovalChannel;
  comment: string | null;
  decided_at: string;
  approval_link_token: string | null;
}

/** Committee members allowed to approve/reject notices — mirrors approver_allowlist. */
export interface ApproverAllowlistEntry {
  id: string;
  committee_member_id: string;
  whatsapp_jid: string | null;
  display_name: string;
  role: string;
  is_active: boolean;
  added_at: string;
}

export type NoticeSendStatus = "queued" | "sent" | "failed";

export interface NoticeSend {
  id: string;
  notice_id: string;
  target_type: NoticeSendTargetType;
  target_id: string;
  target_name: string;
  status: NoticeSendStatus;
  sent_at: string | null;
  error_message: string | null;
  reaction_count: number;
  reply_count: number;
}

/** Resident WhatsApp opt-in/opt-out tracking (2026-08-26 ClickUp audit gap). The
 * collection policy/flow itself is still a committee decision — this only models
 * the resulting state so Phase 3's admin view has something to read. */
export type ConsentStatus = "opted_in" | "opted_out" | "unknown";

export interface ConsentLogEntry {
  id: string;
  resident_identifier: string; // phone/JID or flat number — policy still open, kept generic
  status: ConsentStatus;
  source: string; // how we learned this: e.g. "manual", "whatsapp_reply", "form"
  recorded_at: string;
  notes: string | null;
}

// Phase 4 (Image Generation) — provider-agnostic types, kept here so both the bot
// and the dashboard's Settings page can share them without a circular import.
export type ImageGenProviderName = "cloudflare-workers-ai" | "gemini-nano-banana" | "pollinations";

export interface ImageGenProviderSetting {
  id: string;
  provider: ImageGenProviderName;
  enabled: boolean;
  priority: number; // lower = tried first in the fallback order
  // API keys/tokens live in a separate, more tightly-scoped table (see migration) —
  // never inline them into a type that might get logged or serialized broadly.
}

// ---- Approval audit trail (ClickUp 86d44wm7b) ----

/** Denormalized, read-only view of "who decided what, on which notice, when" —
 * one row per notice_approvals decision, joined with the notice it was decided on.
 * Both the bot (CLI export) and Phase 3's dashboard build this the same shape from
 * their own Supabase client, so the CSV formatter below is shared. */
export interface AuditTrailRow {
  notice_id: string;
  notice_title: string;
  notice_category: NoticeCategory;
  approver_display_name: string;
  approver_role: string;
  action: ApprovalAction;
  channel: ApprovalChannel;
  comment: string | null;
  decided_at: string;
}

const AUDIT_TRAIL_CSV_HEADER = [
  "notice_id",
  "notice_title",
  "notice_category",
  "approver_display_name",
  "approver_role",
  "action",
  "channel",
  "comment",
  "decided_at",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Pure formatter, deliberately dependency-free (no CSV library) so it runs
 * identically in the bot's Node CLI and the dashboard's SvelteKit server. */
export function formatAuditTrailCsv(rows: AuditTrailRow[]): string {
  const lines = [AUDIT_TRAIL_CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      AUDIT_TRAIL_CSV_HEADER.map((key) => escapeCsvField(String(row[key] ?? ""))).join(",")
    );
  }
  return lines.join("\n");
}
