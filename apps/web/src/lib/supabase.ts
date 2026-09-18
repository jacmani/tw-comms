import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";

/** Browser-side Supabase client (anon key, RLS-scoped) for client components —
 * server code should use event.locals.supabase (hooks.server.ts) instead, so
 * requests carry the session cookie correctly. */
export function createBrowserSupabaseClient() {
  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}
