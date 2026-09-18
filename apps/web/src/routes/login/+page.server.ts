import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "").trim();
    if (!email) return fail(400, { error: "Enter your email address." });

    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${url.origin}/auth/callback` },
    });

    if (error) {
      return fail(400, { error: "Couldn't send the sign-in link. Try again in a moment." });
    }
    return { sent: true };
  },
};
