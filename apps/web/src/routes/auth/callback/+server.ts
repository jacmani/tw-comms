import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/** Exchanges the magic-link code for a session, then hands off to hooks.server.ts's
 * authGuard — which redirects back to /login if the now-authenticated email isn't
 * on the approver_allowlist. */
export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get("code");
  if (code) {
    await locals.supabase.auth.exchangeCodeForSession(code);
  }
  throw redirect(303, "/");
};
