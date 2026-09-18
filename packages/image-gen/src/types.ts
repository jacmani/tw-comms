import type { ImageGenProviderName, NoticeCategory } from "@tw-comms/shared";

/**
 * Structured poster request — spec §3.3's poster generator form fields, and
 * nothing else. There is deliberately no free-text "prompt" field: brandGuardrail.ts
 * is the only thing allowed to construct the actual model prompt, per the
 * 2026-08-26 ClickUp audit's "generate freely is the wrong default here."
 */
export interface PosterRequest {
  headline: string;
  detailLines: string[]; // 1-2 lines per spec §3.3
  category: NoticeCategory; // drives accent color/badge automatically
  towerBadge?: "all" | "venus" | "jupiter" | "neptune" | "mercury";
}

export interface GeneratedImage {
  bytes: Uint8Array;
  contentType: string;
  provider: ImageGenProviderName;
  usageEstimate: number;
  usageUnit: string;
}

export type ProviderSecrets = Record<string, string>;

/**
 * Adapter interface — the isolation boundary Phase 4 was asked to mirror from the
 * WhatsApp layer's connection.ts/send.ts split: callers (compose flow, the
 * router below) depend only on this interface, never on a specific provider's
 * SDK/HTTP quirks, so swapping or adding a free-tier provider later is a Settings
 * change, not a code change.
 */
export interface ImageGenProvider {
  readonly name: ImageGenProviderName;
  /** Cheap, synchronous "do we even have what we need" check before attempting a
   * network call — lets the router skip straight to the next provider. */
  isConfigured(secrets: ProviderSecrets): boolean;
  generate(request: PosterRequest, secrets: ProviderSecrets): Promise<GeneratedImage>;
}
