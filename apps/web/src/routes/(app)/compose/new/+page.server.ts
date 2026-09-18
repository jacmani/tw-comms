import { fail, redirect } from "@sveltejs/kit";
import type { Notice, NoticeCategory, NoticeTarget, NoticeTemplate, WhatsAppTarget } from "@tw-comms/shared";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase } = locals;
  const editId = url.searchParams.get("id");
  const category = (url.searchParams.get("category") as NoticeCategory | null) ?? "notice";

  const [templatesRes, targetsRes, existingRes] = await Promise.all([
    supabase.from("notice_templates").select("*").eq("is_active", true).order("name"),
    supabase.from("whatsapp_targets").select("*").eq("is_active", true).order("target_name"),
    editId
      ? supabase.from("notices").select("*").eq("id", editId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    templates: (templatesRes.data ?? []) as NoticeTemplate[],
    targets: (targetsRes.data ?? []) as WhatsAppTarget[],
    existing: existingRes.data as Notice | null,
    defaultCategory: category,
    defaultTemplateId: url.searchParams.get("template") ?? "",
  };
};

function parseTargets(formData: FormData, targets: WhatsAppTarget[]): NoticeTarget[] {
  const selectedIds = new Set(formData.getAll("target_ids").map(String));
  const result: NoticeTarget[] = targets
    .filter((t) => selectedIds.has(t.id))
    .map((t) => ({ target_type: t.target_type, target_id: t.target_id, target_name: t.target_name }));

  // MyGate is always a manual step (spec §4.3), never an actual send target —
  // just a checkbox reminder that becomes a `notice_sends` row so the FM's
  // "post to MyGate" nudge shows up in History too.
  if (formData.get("mygate_reminder")) {
    result.push({ target_type: "mygate_manual", target_id: "mygate", target_name: "MyGate (manual)" });
  }
  return result;
}

export const actions: Actions = {
  save_draft: async ({ request, locals }) => {
    const { supabase, safeGetSession } = locals;
    const { user } = await safeGetSession();
    const formData = await request.formData();
    const targetsRes = await supabase.from("whatsapp_targets").select("*").eq("is_active", true);

    const payload = {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      category: String(formData.get("category") ?? "notice") as NoticeCategory,
      template_id: (formData.get("template_id") as string) || null,
      target_groups: parseTargets(formData, (targetsRes.data ?? []) as WhatsAppTarget[]),
      created_by: user?.id ?? null,
      status: "draft" as const,
    };

    if (!payload.title.trim()) return fail(400, { error: "Title is required." });

    const existingId = formData.get("notice_id") as string | null;
    const { error } = existingId
      ? await supabase.from("notices").update(payload).eq("id", existingId)
      : await supabase.from("notices").insert(payload);

    if (error) return fail(500, { error: "Couldn't save the draft — try again." });
    throw redirect(303, "/");
  },

  submit_for_approval: async ({ request, locals }) => {
    const { supabase, safeGetSession } = locals;
    const { user } = await safeGetSession();
    const formData = await request.formData();
    const targetsRes = await supabase.from("whatsapp_targets").select("*").eq("is_active", true);

    const title = String(formData.get("title") ?? "");
    const body = String(formData.get("body") ?? "");
    if (!title.trim() || !body.trim()) {
      return fail(400, { error: "Title and body are both required to submit." });
    }

    const category = String(formData.get("category") ?? "notice") as NoticeCategory;

    const payload = {
      title,
      body,
      category,
      template_id: (formData.get("template_id") as string) || null,
      target_groups: parseTargets(formData, (targetsRes.data ?? []) as WhatsAppTarget[]),
      created_by: user?.id ?? null,
      // Emergency Alerts bypass approval entirely (spec §5.1) — the send pipeline
      // still needs a human-in-the-loop confirmation step so this isn't an
      // accidental-click siren, but that's Phase 3 UX polish, not built yet;
      // flagged rather than silently auto-sending on this form submit.
      status: "pending_approval" as const,
    };

    const existingId = formData.get("notice_id") as string | null;
    const { error } = existingId
      ? await supabase.from("notices").update(payload).eq("id", existingId)
      : await supabase.from("notices").insert(payload);

    if (error) return fail(500, { error: "Couldn't submit for approval — try again." });
    throw redirect(303, "/");
  },
};
