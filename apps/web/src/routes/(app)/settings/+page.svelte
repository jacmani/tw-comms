<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const providerLabel: Record<string, string> = {
    "cloudflare-workers-ai": "Cloudflare Workers AI (FLUX.1 Schnell) — free tier, default",
    "gemini-nano-banana": "Gemini Nano Banana (AI Studio) — optional, higher quality",
    pollinations: "Pollinations.ai — no-key emergency fallback, no SLA",
  };
</script>

<svelte:head>
  <title>Settings — TWAOA Comms</title>
</svelte:head>

<div class="flex flex-col gap-8">
  <section>
    <h1 class="mb-1 text-xl font-bold">Image Generation Providers</h1>
    <p class="mb-3 text-sm text-[color:var(--color-ink-green)]/70">
      Free-tier only, per Jacob's decision — pick which providers are active and their fallback order.
    </p>

    {#if form?.error}
      <p class="mb-3 rounded-lg bg-[color:var(--color-terracotta)]/10 px-3 py-2 text-sm text-[color:var(--color-terracotta)]">
        {form.error}
      </p>
    {/if}

    <div class="flex flex-col gap-3">
      {#each data.providers as p (p.id)}
        <form method="POST" action="?/update_provider" use:enhance class="rounded-xl border border-[color:var(--color-ink-green)]/15 bg-white p-4">
          <input type="hidden" name="id" value={p.id} />
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="font-medium">{providerLabel[p.provider] ?? p.provider}</p>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1 text-sm">
                Priority
                <input
                  type="number"
                  name="priority"
                  value={p.priority}
                  class="w-16 rounded border border-[color:var(--color-ink-green)]/30 px-2 py-1"
                />
              </label>
              <label class="flex items-center gap-1 text-sm">
                <input type="checkbox" name="enabled" checked={p.enabled} />
                Enabled
              </label>
              <button type="submit" class="rounded-lg bg-[color:var(--color-ink-green)] px-3 py-1.5 text-sm font-medium text-white">
                Save
              </button>
            </div>
          </div>
        </form>
      {/each}
    </div>

    <form method="POST" action="?/set_provider_key" use:enhance class="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-[color:var(--color-marigold)] bg-white p-4">
      <p class="text-sm font-medium">Add/update an API key</p>
      <div class="flex flex-col gap-2 sm:flex-row">
        <select name="provider" class="rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2">
          <option value="cloudflare-workers-ai">Cloudflare Workers AI</option>
          <option value="gemini-nano-banana">Gemini Nano Banana</option>
        </select>
        <input name="key_name" placeholder="e.g. api_token" class="flex-1 rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2" />
        <input name="key_value" type="password" placeholder="value" class="flex-1 rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2" />
        <button type="submit" class="rounded-lg bg-[color:var(--color-ink-green)] px-4 py-2 font-medium text-white">Save</button>
      </div>
      <p class="text-xs text-[color:var(--color-ink-green)]/60">Keys are never shown again once saved.</p>
    </form>
  </section>

  <section>
    <h2 class="mb-1 text-lg font-bold">WhatsApp Send Targets</h2>
    <p class="mb-3 text-sm text-[color:var(--color-ink-green)]/70">
      Groups/channels available in Compose's "Send to" list — add these as they're onboarded (see Rollout &amp; Launch Gate).
    </p>
    <ul class="mb-3 flex flex-col gap-2">
      {#each data.targets as t (t.id)}
        <li class="rounded-lg border border-[color:var(--color-ink-green)]/15 bg-white px-3 py-2 text-sm">
          {t.target_name} — <span class="text-[color:var(--color-ink-green)]/60">{t.target_id}</span>
        </li>
      {:else}
        <li class="text-sm text-[color:var(--color-ink-green)]/60">None configured yet.</li>
      {/each}
    </ul>
    <form method="POST" action="?/add_target" use:enhance class="flex flex-col gap-2 rounded-xl border border-dashed border-[color:var(--color-ink-green)]/30 bg-white p-4 sm:flex-row">
      <select name="target_type" class="rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2">
        <option value="whatsapp_group">Group</option>
        <option value="whatsapp_channel">Channel</option>
      </select>
      <input name="target_id" placeholder="JID (e.g. 1203...@g.us)" class="flex-1 rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2" />
      <input name="target_name" placeholder="Display name" class="flex-1 rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2" />
      <button type="submit" class="rounded-lg bg-[color:var(--color-ink-green)] px-4 py-2 font-medium text-white">Add</button>
    </form>
  </section>
</div>
