import type { PosterRequest } from "./types.js";

/** Matches poster_presets.layout (0008_image_gen.sql) — a small, fixed set of
 * style knobs a preset can override, not an arbitrary jsonb blob a preset could
 * use to smuggle in freeform prompt text (same "no freeform prompts" posture as
 * brandGuardrail.ts). */
export interface PosterPresetLayout {
  towerBadge?: PosterRequest["towerBadge"];
}

/**
 * "Template presets library" (ClickUp 86d44wmh6) — applies a saved preset's
 * layout defaults onto a request, without ever overriding what the FM actually
 * typed (headline/detail lines/category always win).
 */
export function applyPreset(preset: PosterPresetLayout, request: PosterRequest): PosterRequest {
  return {
    ...request,
    towerBadge: request.towerBadge ?? preset.towerBadge,
  };
}
