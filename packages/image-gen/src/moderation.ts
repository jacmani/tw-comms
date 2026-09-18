import type { NoticeCategory } from "@tw-comms/shared";

/**
 * "Pre-send moderation/review step for generated images" (ClickUp 86d44wmg1).
 * There's no automated content-safety check here — that would need a paid
 * vision-moderation API, out of scope for the free-tier-only decision. Instead,
 * per the 2026-08-26 ClickUp audit ("a moderation step before an AI-generated
 * image goes out under the Association's name"), this enforces that a generated
 * image is never allowed to skip the human approval gate Phase 2 already built.
 *
 * REAL TENSION, FLAGGED RATHER THAN DECIDED: Emergency Alerts bypass approval
 * entirely by design (spec §5.1, time-critical). If an Emergency Alert has a
 * generated image attached, should it still bypass review? This treats "yes, an
 * image forces review even for Emergency" as the safer default, but that could
 * be wrong for an actually time-critical situation — Jacob should confirm.
 */
export function requiresMandatoryReview(hasGeneratedImage: boolean, category: NoticeCategory): boolean {
  if (!hasGeneratedImage) return false;
  return true; // any category with a generated image goes through review — see the flag above re: emergency
}
