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

export interface Notice {
  id: string;
  template_id: string | null;
  title: string;
  body: string;
  image_url: string | null;
  category: NoticeCategory;
  target_groups: string[];
  status: NoticeStatus;
  created_by: string | null;
  created_at: string;
  mygate_posted: boolean;
  mygate_posted_at: string | null;
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

export type NoticeSendTargetType = "whatsapp_group" | "whatsapp_channel" | "mygate_manual";
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
