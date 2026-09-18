import { fail } from "@sveltejs/kit";
import type { ConsentLogEntry, ConsentStatus } from "@tw-comms/shared";
import type { Actions, PageServerLoad } from "./$types";

/** Admin view of consent_log (2026-08-26 ClickUp audit gap). This screen only
 * records what's already known about a resident's WhatsApp opt-in/opt-out status
 * — it does not implement or decide the actual consent-collection flow, which is
 * still an open committee decision (DPDP Act compliance). */
export const load: PageServerLoad = async ({ locals }) => {
  const { data } = await locals.supabase
    .from("consent_log")
    .select("*")
    .order("recorded_at", { ascending: false })
    .limit(200);
  return { entries: (data ?? []) as ConsentLogEntry[] };
};

export const actions: Actions = {
  record: async ({ request, locals }) => {
    const formData = await request.formData();
    const residentIdentifier = String(formData.get("resident_identifier") ?? "").trim();
    const status = String(formData.get("status") ?? "unknown") as ConsentStatus;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!residentIdentifier) return fail(400, { error: "Resident identifier is required." });

    const { error } = await locals.supabase.from("consent_log").insert({
      resident_identifier: residentIdentifier,
      status,
      source: "manual",
      notes,
    });

    if (error) return fail(500, { error: "Couldn't record this entry — try again." });
    return { success: true };
  },
};
