import { fail } from "@sveltejs/kit";
import type { ImageGenProviderSetting, WhatsAppTarget } from "@tw-comms/shared";
import type { Actions, PageServerLoad } from "./$types";

/**
 * Settings (Phase 4, ClickUp 86d44wmfd) — pick the active image-gen provider(s)
 * and fallback order, and store API keys server-side. Keys are write-only from
 * this screen's perspective: `image_gen_provider_secrets` is never read back to
 * the browser (see 0008_image_gen.sql's RLS — no select policy for approvers on
 * that table), only written.
 *
 * Also doubles as the admin screen for `whatsapp_targets` (compose's send-target
 * checklist, see 0009_whatsapp_targets.sql) since both are "system configuration"
 * in the same spirit, and neither is big enough alone to justify its own nav item.
 */
export const load: PageServerLoad = async ({ locals }) => {
  const [providersRes, targetsRes] = await Promise.all([
    locals.supabase.from("image_gen_provider_settings").select("*").order("priority"),
    locals.supabase.from("whatsapp_targets").select("*").order("target_name"),
  ]);

  return {
    providers: (providersRes.data ?? []) as ImageGenProviderSetting[],
    targets: (targetsRes.data ?? []) as WhatsAppTarget[],
  };
};

export const actions: Actions = {
  update_provider: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = String(formData.get("id"));
    const enabled = formData.get("enabled") === "on";
    const priority = Number(formData.get("priority") ?? 100);

    const { error } = await locals.supabase.from("image_gen_provider_settings").update({ enabled, priority }).eq("id", id);
    if (error) return fail(500, { error: "Couldn't update the provider — try again." });
    return { success: true };
  },

  set_provider_key: async ({ request, locals }) => {
    // Note: writing via the RLS-scoped session client — image_gen_provider_secrets
    // has no policy at all for approvers (0008_image_gen.sql), so this insert only
    // succeeds when the dashboard's server code runs with the service role
    // instead. Flagged rather than silently failing: this action needs the
    // dashboard's server-side Supabase client to use the service role key for
    // this one table, which isn't wired up yet (locals.supabase is the anon/RLS
    // client everywhere else in this app) — see the ClickUp comment on 86d44wmfd.
    const formData = await request.formData();
    const provider = String(formData.get("provider"));
    const keyName = String(formData.get("key_name"));
    const keyValue = String(formData.get("key_value"));

    if (!keyValue) return fail(400, { error: "Enter a value." });

    const { error } = await locals.supabase
      .from("image_gen_provider_secrets")
      .upsert({ provider, key_name: keyName, key_value: keyValue }, { onConflict: "provider,key_name" });

    if (error) {
      return fail(500, {
        error: "Couldn't save the key from here — this screen needs a service-role write path, not yet wired up (see the code comment).",
      });
    }
    return { success: true };
  },

  add_target: async ({ request, locals }) => {
    const formData = await request.formData();
    const targetType = String(formData.get("target_type") ?? "whatsapp_group");
    const targetId = String(formData.get("target_id") ?? "").trim();
    const targetName = String(formData.get("target_name") ?? "").trim();

    if (!targetId || !targetName) return fail(400, { error: "JID and display name are both required." });

    const { error } = await locals.supabase.from("whatsapp_targets").insert({
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
    });
    if (error) return fail(500, { error: "Couldn't add the target — try again." });
    return { success: true };
  },
};
