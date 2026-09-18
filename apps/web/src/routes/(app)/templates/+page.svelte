<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let showNewForm = $state(false);

  const categoryBadge: Record<string, string> = {
    notice: "bg-[color:var(--color-ink-green)]/15 text-[color:var(--color-ink-green)]",
    event: "bg-[color:var(--color-marigold)]/25 text-[color:var(--color-ink-green)]",
    advertisement: "bg-[color:var(--color-terracotta)]/15 text-[color:var(--color-terracotta)]",
    emergency: "bg-[color:var(--color-terracotta)] text-white",
  };
</script>

<svelte:head>
  <title>Templates — TWAOA Comms</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <h1 class="text-xl font-bold">Templates</h1>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {#each data.templates as t (t.id)}
      <a
        href="/compose/new?template={t.id}"
        class="rounded-xl border border-[color:var(--color-ink-green)]/15 bg-white p-4"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="font-semibold">{t.name}</span>
          <span class="rounded-full px-2 py-0.5 text-xs {categoryBadge[t.category]}">{t.category}</span>
        </div>
        <p class="line-clamp-3 text-sm text-[color:var(--color-ink-green)]/70">{t.body_template}</p>
      </a>
    {/each}

    <button
      type="button"
      onclick={() => (showNewForm = !showNewForm)}
      class="flex items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--color-ink-green)]/40 p-4 text-[color:var(--color-ink-green)]/70"
    >
      + New Template
    </button>
  </div>

  {#if showNewForm}
    <form
      method="POST"
      action="?/create"
      use:enhance={() => async ({ update }) => {
        await update();
        showNewForm = false;
      }}
      class="flex flex-col gap-3 rounded-xl border border-[color:var(--color-ink-green)]/15 bg-white p-4"
    >
      {#if form?.error}
        <p class="text-sm text-[color:var(--color-terracotta)]">{form.error}</p>
      {/if}
      <div>
        <label class="mb-1 block text-sm font-medium" for="name">Name</label>
        <input id="name" name="name" required class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="category">Category</label>
        <select id="category" name="category" class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2">
          <option value="notice">Notice</option>
          <option value="event">Event</option>
          <option value="advertisement">Advertisement</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="body_template">Body</label>
        <textarea
          id="body_template"
          name="body_template"
          rows="4"
          required
          class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2"
          placeholder="Use {'{'}tower{'}'}, {'{'}date{'}'}, {'{'}flat_count{'}'} as placeholders"
        ></textarea>
        <p class="mt-1 text-xs text-[color:var(--color-ink-green)]/60">
          Available placeholders: <code>{"{tower}"}</code>, <code>{"{date}"}</code>, <code>{"{flat_count}"}</code>
        </p>
      </div>
      <button type="submit" class="rounded-lg bg-[color:var(--color-ink-green)] px-4 py-2 font-medium text-white">
        Save Template
      </button>
    </form>
  {/if}
</div>
