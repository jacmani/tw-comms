import type { Notice, NoticeCategory } from "@tw-comms/shared";
import type { PageServerLoad } from "./$types";

/** History (spec §3.5) — filterable list + calendar-heatmap-by-day. The heatmap
 * component itself is a reuse-from-tw-water-automation item per the UI doc's
 * component-reuse map; not pulled in here since that repo isn't available in
 * this workspace (CLAUDE.md: "Don't touch the tw-water-automation repo") —
 * flagged as a follow-up rather than approximated with a different chart. */
export const load: PageServerLoad = async ({ locals, url }) => {
  const category = url.searchParams.get("category") as NoticeCategory | null;

  let query = locals.supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(200);
  if (category) query = query.eq("category", category);

  const { data } = await query;
  return { notices: (data ?? []) as Notice[], category };
};
