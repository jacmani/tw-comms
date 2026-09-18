import { buildBrandedPrompt } from "../brandGuardrail.js";
import type { GeneratedImage, ImageGenProvider, PosterRequest, ProviderSecrets } from "../types.js";

/**
 * Pollinations.ai — no-key emergency fallback. Simple GET-based image API, no
 * SLA, no auth. Lowest priority by default (0008_image_gen.sql) — used only when
 * both configured providers are disabled/unreachable.
 *
 * UNVERIFIED: not exercised against the live endpoint in this environment.
 */
export const pollinationsProvider: ImageGenProvider = {
  name: "pollinations",

  isConfigured(): boolean {
    return true; // no key needed — always "configured"
  },

  async generate(request: PosterRequest): Promise<GeneratedImage> {
    const prompt = buildBrandedPrompt(request);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Pollinations request failed: ${res.status}`);
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    return {
      bytes,
      contentType: res.headers.get("content-type") ?? "image/jpeg",
      provider: "pollinations",
      usageEstimate: 1,
      usageUnit: "requests",
    };
  },
};

// Unused-parameter note: `secrets: ProviderSecrets` is intentionally omitted from
// generate()'s signature since this provider never needs any — it still
// satisfies ImageGenProvider structurally because TS allows a shorter parameter
// list on the implementation.
