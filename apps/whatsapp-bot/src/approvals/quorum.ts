/**
 * Quorum enforcement (ClickUp 86d44wm66). The actual quorum rule is still an open
 * [human] decision (86d44wjuj) — this implements a clearly-labeled PROVISIONAL
 * default so Phase 2 isn't blocked on governance, per Jacob's 2026-09-19 direction.
 * Swap `config.approval.quorumCount` (env: APPROVAL_QUORUM_COUNT) once decided;
 * nothing else here should need to change.
 */

export type QuorumResult =
  | { met: true }
  | { met: false; reason: "no_qualified_approvers" }
  | { met: false; reason: "insufficient_approvals"; have: number; need: number };

/**
 * `qualifiedPoolSize` is the number of active allowlisted approvers who could ever
 * satisfy this category (see allowlist.ts's countActiveApproversForRoles) — capping
 * the requirement at the pool size means a small committee (or, worse, a still-empty
 * allowlist) can't create an unsatisfiable quorum. A pool of zero is treated as
 * "quorum can never be met" rather than "quorum of zero is trivially met", so an
 * empty allowlist fails closed (nothing auto-approves) instead of open.
 */
export function evaluateQuorum(
  distinctQualifiedApprovals: number,
  qualifiedPoolSize: number,
  configuredQuorum: number
): QuorumResult {
  if (qualifiedPoolSize <= 0) {
    return { met: false, reason: "no_qualified_approvers" };
  }
  const need = Math.min(configuredQuorum, qualifiedPoolSize);
  if (distinctQualifiedApprovals >= need) return { met: true };
  return { met: false, reason: "insufficient_approvals", have: distinctQualifiedApprovals, need };
}

/** Emergency Alerts (spec §5.1) bypass approval entirely — empty required_roles is the signal. */
export function requiresApproval(requiredRoles: string[]): boolean {
  return requiredRoles.length > 0;
}
