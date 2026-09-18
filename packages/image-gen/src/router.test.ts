import { test } from "node:test";
import assert from "node:assert/strict";
import { generateWithFallback } from "./router.js";
import type { GeneratedImage, ImageGenProvider, PosterRequest } from "./types.js";

const request: PosterRequest = { headline: "H", detailLines: [], category: "notice" };

function fakeProvider(
  name: ImageGenProvider["name"],
  behavior: "succeed" | "fail" | "unconfigured"
): ImageGenProvider {
  return {
    name,
    isConfigured: () => behavior !== "unconfigured",
    generate: async (): Promise<GeneratedImage> => {
      if (behavior === "fail") throw new Error(`${name} exploded`);
      return { bytes: new Uint8Array(), contentType: "image/png", provider: name, usageEstimate: 1, usageUnit: "requests" };
    },
  };
}

test("generateWithFallback tries providers in priority order and returns the first success", async () => {
  const providers = [fakeProvider("cloudflare-workers-ai", "succeed"), fakeProvider("pollinations", "succeed")];
  const result = await generateWithFallback(
    request,
    providers,
    [
      { provider: "pollinations", enabled: true, priority: 3 },
      { provider: "cloudflare-workers-ai", enabled: true, priority: 1 },
    ],
    {}
  );
  assert.equal(result.provider, "cloudflare-workers-ai");
});

test("generateWithFallback skips disabled and unconfigured providers, falls through on failure", async () => {
  const providers = [
    fakeProvider("cloudflare-workers-ai", "unconfigured"),
    fakeProvider("gemini-nano-banana", "fail"),
    fakeProvider("pollinations", "succeed"),
  ];
  const result = await generateWithFallback(
    request,
    providers,
    [
      { provider: "cloudflare-workers-ai", enabled: true, priority: 1 },
      { provider: "gemini-nano-banana", enabled: true, priority: 2 },
      { provider: "pollinations", enabled: true, priority: 3 },
    ],
    {}
  );
  assert.equal(result.provider, "pollinations");
});

test("generateWithFallback throws with every attempted provider's error when all fail", async () => {
  const providers = [fakeProvider("cloudflare-workers-ai", "fail"), fakeProvider("pollinations", "fail")];
  await assert.rejects(
    generateWithFallback(
      request,
      providers,
      [
        { provider: "cloudflare-workers-ai", enabled: true, priority: 1 },
        { provider: "pollinations", enabled: true, priority: 2 },
      ],
      {}
    ),
    /cloudflare-workers-ai.*pollinations|All enabled image-gen providers failed/s
  );
});

test("generateWithFallback throws a clear error when nothing is enabled", async () => {
  await assert.rejects(
    generateWithFallback(request, [], [{ provider: "pollinations", enabled: false, priority: 1 }], {}),
    /No image-gen providers are enabled/
  );
});
