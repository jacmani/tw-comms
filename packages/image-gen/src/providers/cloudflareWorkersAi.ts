import { buildBrandedPrompt } from "../brandGuardrail.js";
import type { GeneratedImage, ImageGenProvider, PosterRequest, ProviderSecrets } from "../types.js";

/**
 * Cloudflare Workers AI — FLUX.1 [schnell] (`@cf/black-forest-labs/flux-1-schnell`).
 * Default/primary provider per Jacob's decision: a genuinely free published tier
 * (~10k neurons/day as of this writing).
 *
 * UNVERIFIED: no live Cloudflare account/API token in this environment — this
 * follows Cloudflare's documented request/response contract for this specific
 * model (JSON body in, `{ result: { image: <base64 PNG> } }` out — this model is
 * one of the few Workers AI image models that returns base64-in-JSON rather than
 * a raw binary stream) but has not been exercised against the real API.
 *
 * Secrets required: `account_id`, `api_token` (scoped Workers AI token).
 */
export const cloudflareWorkersAiProvider: ImageGenProvider = {
  name: "cloudflare-workers-ai",

  isConfigured(secrets: ProviderSecrets): boolean {
    return Boolean(secrets.account_id && secrets.api_token);
  },

  async generate(request: PosterRequest, secrets: ProviderSecrets): Promise<GeneratedImage> {
    const prompt = buildBrandedPrompt(request);
    const url = `https://api.cloudflare.com/client/v4/accounts/${secrets.account_id}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secrets.api_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      throw new Error(`Cloudflare Workers AI request failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { success: boolean; result?: { image?: string }; errors?: unknown[] };
    if (!json.success || !json.result?.image) {
      throw new Error(`Cloudflare Workers AI returned no image: ${JSON.stringify(json.errors ?? json)}`);
    }

    return {
      bytes: Buffer.from(json.result.image, "base64"),
      contentType: "image/png",
      provider: "cloudflare-workers-ai",
      // Neurons-per-request varies by model/steps; Cloudflare's own dashboard is
      // the source of truth. This is a placeholder unit count for relative
      // tracking against the free daily allowance, not a verified figure —
      // update once real usage data is available (see 86d44wmgv's cost log).
      usageEstimate: 1,
      usageUnit: "requests",
    };
  },
};
