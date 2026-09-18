import type { ImageGenProviderName, ImageGenProviderSetting } from "@tw-comms/shared";
import type { GeneratedImage, ImageGenProvider, PosterRequest, ProviderSecrets } from "./types.js";

/**
 * "Auto-send on threshold met" (86d44wm66) has a Phase 4 analogue here: try
 * providers in priority order, falling to the next enabled one on any failure —
 * a disabled provider or one missing its secrets is skipped without counting as
 * a failure worth surfacing on its own. Pollinations (no key required) makes a
 * reasonable last-resort default even if nothing else is configured.
 */
export async function generateWithFallback(
  request: PosterRequest,
  providers: ImageGenProvider[],
  configs: Pick<ImageGenProviderSetting, "provider" | "enabled" | "priority">[],
  secretsByProvider: Partial<Record<ImageGenProviderName, ProviderSecrets>>
): Promise<GeneratedImage> {
  const ordered = [...configs].filter((c) => c.enabled).sort((a, b) => a.priority - b.priority);
  const attempts: string[] = [];

  for (const cfg of ordered) {
    const provider = providers.find((p) => p.name === cfg.provider);
    if (!provider) continue;

    const secrets = secretsByProvider[cfg.provider] ?? {};
    if (!provider.isConfigured(secrets)) {
      attempts.push(`${cfg.provider}: not configured`);
      continue;
    }

    try {
      return await provider.generate(request, secrets);
    } catch (err) {
      attempts.push(`${cfg.provider}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    ordered.length === 0
      ? "No image-gen providers are enabled."
      : `All enabled image-gen providers failed: ${attempts.join("; ")}`
  );
}
