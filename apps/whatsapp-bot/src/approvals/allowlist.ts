import type { ApproverAllowlistEntry, NoticeCategory } from "@tw-comms/shared";
import { getSupabaseClient } from "../supabase.js";
import { logger } from "../logger.js";

/**
 * "Approver allowlist mapped to committee roles" (ClickUp 86d44wjt4). Looks up an
 * incoming reaction's sender JID against approver_allowlist, and checks whether
 * their role satisfies a notice category's approval_rules.required_roles.
 *
 * The allowlist is empty until a human supplies real committee phone numbers
 * (ClickUp 86d44wjr7) — every function here treats "no rows" as "nobody qualifies
 * yet", never as "anyone qualifies", so an empty table fails closed, not open.
 */

export async function resolveApprover(jid: string): Promise<ApproverAllowlistEntry | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("approver_allowlist")
    .select("*")
    .eq("whatsapp_jid", jid)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, jid }, "failed to look up approver_allowlist");
    return null;
  }
  return (data as ApproverAllowlistEntry | null) ?? null;
}

export async function getRequiredRoles(category: NoticeCategory): Promise<string[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("approval_rules")
    .select("required_roles")
    .eq("category", category)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, category }, "failed to look up approval_rules");
    return null;
  }
  return (data?.required_roles as string[] | undefined) ?? null;
}

/**
 * Pure decision function, kept separate from the Supabase lookups above so it can
 * be unit-tested without a database (see allowlist.test.ts).
 */
export function isQualifiedApprover(
  approver: Pick<ApproverAllowlistEntry, "role" | "is_active"> | null,
  requiredRoles: string[]
): boolean {
  if (!approver || !approver.is_active) return false;
  // An empty required_roles list means the category bypasses approval entirely
  // (Emergency Alerts, spec §5.1) — that's decided upstream by checking
  // requiredRoles.length === 0 before ever asking "is this person qualified",
  // not by treating an empty list as "anyone qualifies" here.
  return requiredRoles.includes(approver.role);
}

export async function countActiveApproversForRoles(requiredRoles: string[]): Promise<number> {
  const client = getSupabaseClient();
  if (!client || requiredRoles.length === 0) return 0;

  const { count, error } = await client
    .from("approver_allowlist")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .in("role", requiredRoles);

  if (error) {
    logger.error({ err: error, requiredRoles }, "failed to count approver_allowlist pool");
    return 0;
  }
  return count ?? 0;
}
