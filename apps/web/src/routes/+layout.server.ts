import { getBotHealthSummary } from "$lib/server/botHealth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { session } = await locals.safeGetSession();
  const showNav = !!session && locals.isApprover && !url.pathname.startsWith("/login");

  return {
    session,
    isApprover: locals.isApprover,
    showNav,
    // Bot status dot is "always visible regardless of screen" per spec §3.1 — only
    // worth the query once the user is actually past the login gate.
    botHealth: showNav ? await getBotHealthSummary(locals.supabase) : null,
  };
};
