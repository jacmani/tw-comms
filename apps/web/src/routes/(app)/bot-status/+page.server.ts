import type { BotHealthLogRow } from "@tw-comms/shared";
import { getBotHealthSummary } from "$lib/server/botHealth";
import type { PageServerLoad } from "./$types";

/** Bot Status (spec §3.7/§4.4) — not itself a named Phase 3 ClickUp task (the
 * live task list has no "Bot Status screen" entry, unlike the draft in
 * 04-clickup-task-plan.md which did), built anyway per explicit direction since
 * it's spec'd in both 01-specification.md §4.4 and 02-ui-design.md §3.7 and reads
 * directly off the corrected bot_health_log schema (ClickUp 86d45pbj8). */
export const load: PageServerLoad = async ({ locals }) => {
  const [summary, recentRes] = await Promise.all([
    getBotHealthSummary(locals.supabase),
    locals.supabase.from("bot_health_log").select("*").order("logged_at", { ascending: false }).limit(5),
  ]);

  return {
    summary,
    recentEvents: (recentRes.data ?? []) as BotHealthLogRow[],
  };
};
