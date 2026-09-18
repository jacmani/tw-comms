import { error, json } from "@sveltejs/kit";
import type { ImageGenProviderSetting, NoticeCategory } from "@tw-comms/shared";
import {
  cloudflareWorkersAiProvider,
  generateWithFallback,
  geminiNanoBananaProvider,
  pollinationsProvider,
  type PosterRequest,
  type ProviderSecrets,
} from "@tw-comms/image-gen";
import { createSupabaseAdminClient } from "$lib/server/supabaseAdmin";
import type { RequestHandler } from "./$types";

const PROVIDERS = [cloudflareWorkersAiProvider, geminiNanoBananaProvider, pollinationsProvider];

/**
 * "Integrate chosen provider behind a template/brand-guardrail wrapper" (ClickUp
 * 86d44wmfd) — the actual integration point. Poster generation itself
 * (§3.3's sub-flow) isn't wired into the Compose UI yet (flagged in
 * apps/web/README.md); this endpoint demonstrates the full path — request in,
 * brand-guarded provider call with fallback, image bytes out — that a future
 * "Generate poster" button in compose/new would call.
 *
 * Returns the raw image so the caller can preview it; attaching it to a notice
 * (uploading to storage, setting notices.image_url) is a follow-up not built
 * here — no Supabase Storage bucket exists yet for this project.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const body = (await request.json()) as PosterRequest;
  if (!body.headline) throw error(400, "headline is required");

  const [settingsRes, secretsRes] = await Promise.all([
    locals.supabase.from("image_gen_provider_settings").select("*").order("priority"),
    createSupabaseAdminClient().from("image_gen_provider_secrets").select("*"),
  ]);

  const settings = (settingsRes.data ?? []) as ImageGenProviderSetting[];
  const secretsByProvider: Partial<Record<string, ProviderSecrets>> = {};
  for (const row of (secretsRes.data ?? []) as { provider: string; key_name: string; key_value: string }[]) {
    secretsByProvider[row.provider] ??= {};
    secretsByProvider[row.provider]![row.key_name] = row.key_value;
  }

  const posterRequest: PosterRequest = {
    headline: body.headline,
    detailLines: body.detailLines ?? [],
    category: (body.category ?? "notice") as NoticeCategory,
    towerBadge: body.towerBadge,
  };

  try {
    const image = await generateWithFallback(posterRequest, PROVIDERS, settings, secretsByProvider);
    return new Response(Buffer.from(image.bytes), {
      headers: { "content-type": image.contentType, "x-image-gen-provider": image.provider },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
};
