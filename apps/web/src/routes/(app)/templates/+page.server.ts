import { fail } from "@sveltejs/kit";
import type { NoticeCategory, NoticeTemplate } from "@tw-comms/shared";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const { data } = await locals.supabase
    .from("notice_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return { templates: (data ?? []) as NoticeTemplate[] };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const { supabase, safeGetSession } = locals;
    const { user } = await safeGetSession();
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const bodyTemplate = String(formData.get("body_template") ?? "").trim();
    const category = String(formData.get("category") ?? "notice") as NoticeCategory;

    if (!name || !bodyTemplate) return fail(400, { error: "Name and body are both required." });

    const { error } = await supabase.from("notice_templates").insert({
      name,
      body_template: bodyTemplate,
      category,
      created_by: user?.id ?? null,
    });

    if (error) return fail(500, { error: "Couldn't save the template — try again." });
    return { success: true };
  },
};
