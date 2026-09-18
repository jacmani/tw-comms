import type { PosterRequest } from "./types.js";

/**
 * NOTE on scope vs. 01-specification.md §8: that section describes a
 * deterministic `html-to-image` template render (fixed layout, design tokens
 * applied via CSS), not generative AI image synthesis. The live ClickUp Phase 4
 * tasks ("Integrate chosen provider," "moderation/review step for generated
 * images," "Cost tracking") and Jacob's free-tier-provider direction describe
 * genuine text-to-image generation instead — a real scope evolution past §8, not
 * an oversight. Flagging the divergence rather than silently picking one.
 */

const TOWER_LABELS: Record<NonNullable<PosterRequest["towerBadge"]>, string> = {
  all: "all four towers (Venus, Jupiter, Neptune, Mercury)",
  venus: "Venus tower",
  jupiter: "Jupiter tower",
  neptune: "Neptune tower",
  mercury: "Mercury tower",
};

const CATEGORY_STYLE: Record<PosterRequest["category"], string> = {
  notice: "calm, official tone, ink-green (#2F4A34) as the dominant accent color",
  event: "warm, celebratory tone, marigold (#D9A441) as the dominant accent color",
  advertisement: "clearly marked as a sponsored/advertisement banner, terracotta (#C1502E) accent",
  emergency: "urgent but not alarmist tone, terracotta (#C1502E) as a warning accent, high contrast",
};

/**
 * The ONLY function allowed to construct a model prompt — no caller may pass a
 * free-text prompt through to a provider (ClickUp audit: "generate freely is the
 * wrong default here"). Builds a brand-constrained prompt from PosterRequest's
 * structured fields only, so nothing beyond headline/detail lines/category/tower
 * can influence what gets generated.
 */
export function buildBrandedPrompt(request: PosterRequest): string {
  const lines = [
    `A residential-community notice poster for "Trinity World Apartment Owners Association" (TWAOA).`,
    `Headline text prominently displayed: "${request.headline}".`,
  ];

  if (request.detailLines.length > 0) {
    lines.push(`Supporting detail text: ${request.detailLines.map((l) => `"${l}"`).join(", ")}.`);
  }

  lines.push(`Style: ${CATEGORY_STYLE[request.category]}. Background parchment tone (#F4E9CC).`);
  lines.push(`Typography style evoking a serif display headline (Fraunces) with clean sans-serif body text (DM Sans).`);

  if (request.towerBadge) {
    lines.push(`Include a small badge indicating: ${TOWER_LABELS[request.towerBadge]}.`);
  }

  lines.push(
    "Flat, modern poster/flyer illustration style — no photorealistic human faces, no text artifacts beyond the specified headline/detail text, no unrelated logos or brands."
  );

  return lines.join(" ");
}
