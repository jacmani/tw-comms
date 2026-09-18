import { buildBrandedPrompt } from "../brandGuardrail.js";
import type { GeneratedImage, ImageGenProvider, PosterRequest, ProviderSecrets } from "../types.js";

/**
 * Gemini 2.5 Flash Image ("Nano Banana") via an AI Studio API key. Optional
 * secondary provider — higher quality, but a less durable free-tier guarantee:
 * Google's formal pricing page lists image generation as paid-only, and the free
 * AI Studio allowance is documented as subject to change without the same
 * published-forever guarantee Cloudflare's free tier carries. Disabled by
 * default in `image_gen_provider_settings` (0008_image_gen.sql) for that reason.
 *
 * UNVERIFIED: no AI Studio key in this environment — follows the documented
 * `generateContent` request/response shape (inline base64 image data in a
 * response part) but has not been exercised against the real API.
 *
 * Secrets required: `api_key`.
 */
export const geminiNanoBananaProvider: ImageGenProvider = {
  name: "gemini-nano-banana",

  isConfigured(secrets: ProviderSecrets): boolean {
    return Boolean(secrets.api_key);
  },

  async generate(request: PosterRequest, secrets: ProviderSecrets): Promise<GeneratedImage> {
    const prompt = buildBrandedPrompt(request);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${secrets.api_key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!res.ok) {
      throw new Error(`Gemini Nano Banana request failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
    };

    const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      throw new Error("Gemini Nano Banana returned no inline image data");
    }

    return {
      bytes: Buffer.from(imagePart.inlineData.data, "base64"),
      contentType: imagePart.inlineData.mimeType ?? "image/png",
      provider: "gemini-nano-banana",
      usageEstimate: 1,
      usageUnit: "requests",
    };
  },
};
