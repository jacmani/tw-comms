import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { type Handle, redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptionsWithName;
}

/**
 * Standard @supabase/ssr cookie-based session wiring, plus the Phase 3
 * "committee login restricted to the approvers allowlist" gate (ClickUp
 * 86d44wma8) — every route under (app) requires an authenticated session AND
 * `is_active_approver()` (see 0007_committee_login_rls.sql) to return true for
 * that session, not just any Supabase Auth user.
 */
const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: "/" });
        });
      },
    },
  });

  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();
    if (error) return { session: null, user: null };

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version";
    },
  });
};

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession();

  event.locals.isApprover = false;
  if (session && user) {
    // RLS-scoped read as the logged-in user — is_active_approver() is
    // security-definer, but calling it through the user's own client keeps this
    // check on the same trust boundary the rest of the dashboard's queries use.
    const { data } = await event.locals.supabase.rpc("is_active_approver");
    event.locals.isApprover = data === true;
  }

  const isPublicRoute = event.url.pathname.startsWith("/login") || event.url.pathname.startsWith("/auth");

  if (!isPublicRoute && (!session || !event.locals.isApprover)) {
    throw redirect(303, "/login");
  }

  return resolve(event);
};

export const handle = sequence(supabase, authGuard);
