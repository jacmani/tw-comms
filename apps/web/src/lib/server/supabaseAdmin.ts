import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private";

/**
 * Service-role client for the handful of operations that must bypass RLS by
 * design — `image_gen_provider_secrets` has no approver-read policy at all
 * (0008_image_gen.sql), on purpose, so reading/writing API keys has to go
 * through here rather than `locals.supabase` (the anon/RLS-scoped client every
 * other route in this app uses). Server-only: `$env/static/private` is never
 * bundled to the client, unlike the `PUBLIC_` vars.
 */
export function createSupabaseAdminClient() {
  return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
