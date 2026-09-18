import type { Notice } from "@tw-comms/shared";
import type { PageServerLoad } from "./$types";

/** Compose home (spec §3.1) — the FM's open loops surface directly here rather
 * than behind a dashboard-of-widgets, per the UI doc's IA. */
export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;

  const [pending, drafts, recentlySent] = await Promise.all([
    supabase
      .from("notices")
      .select("*")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false }),
    supabase.from("notices").select("*").eq("status", "draft").order("created_at", { ascending: false }),
    supabase
      .from("notices")
      .select("*")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    pending: (pending.data ?? []) as Notice[],
    drafts: (drafts.data ?? []) as Notice[],
    recentlySent: (recentlySent.data ?? []) as Notice[],
  };
};
