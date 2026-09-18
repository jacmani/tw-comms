<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head>
  <title>Sign in — TWAOA Comms</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
  <h1 class="mb-1 text-2xl font-bold text-[color:var(--color-ink-green)]">TWAOA Comms</h1>
  <p class="mb-8 text-sm text-[color:var(--color-ink-green)]/70">
    Sign in with your committee email — we'll send a one-tap link, no password needed.
  </p>

  {#if form?.sent}
    <div class="rounded-lg border border-[color:var(--color-ink-green)]/20 bg-white p-4 text-sm">
      Check your email for a sign-in link.
    </div>
  {:else}
    <form
      method="POST"
      class="flex flex-col gap-3"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}
    >
      <label class="text-sm font-medium" for="email">Email address</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autocomplete="email"
        class="rounded-lg border border-[color:var(--color-ink-green)]/30 bg-white px-4 py-3 text-base"
        placeholder="you@example.com"
      />
      {#if form?.error}
        <p class="text-sm text-[color:var(--color-terracotta)]">{form.error}</p>
      {/if}
      <button
        type="submit"
        disabled={submitting}
        class="mt-2 rounded-lg bg-[color:var(--color-ink-green)] px-4 py-3 text-base font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  {/if}
</div>
