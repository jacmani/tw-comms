<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let title = $state(data.existing?.title ?? "");
  let body = $state(data.existing?.body ?? "");
  let category = $state(data.existing?.category ?? data.defaultCategory);
  let templateId = $state(data.existing?.template_id ?? data.defaultTemplateId ?? "");
  let mygateReminder = $state(true);

  function applyTemplate() {
    const t = data.templates.find((tpl) => tpl.id === templateId);
    if (t) body = t.body_template;
  }

  // Coming from the Templates screen's "+New Template card" grid tap (?template=id)
  // pre-fills the body immediately, same as picking it from the dropdown would.
  if (!data.existing && data.defaultTemplateId) applyTemplate();
</script>

<svelte:head>
  <title>{category === "advertisement" ? "New Advertisement" : "New Notice"} — TWAOA Comms</title>
</svelte:head>

<!--
  Spec §3.2 describes a 5-step wizard (template → details → image → targets →
  review). Condensed to one page here for the MVP build — same fields and same
  submit semantics, just not paginated. Flagging as a deliberate UX
  simplification, not a scope cut: the poster-generation sub-flow (§3.3, Phase 4)
  isn't wired in yet either — "Add image" is out of scope for this page until
  Phase 4's provider adapters are attached to compose.
-->
<!-- Keyed on the notice/template identity so navigating from one draft or
     template straight to another (client-side routing, no full reload) remounts
     the form with fresh $state instead of leaking the previous notice's values —
     see svelte-check's state_referenced_locally warning this silences. -->
{#key data.existing?.id ?? data.defaultTemplateId}
<form method="POST" use:enhance class="flex flex-col gap-5">
  <input type="hidden" name="notice_id" value={data.existing?.id ?? ""} />

  <h1 class="text-xl font-bold">{category === "advertisement" ? "New Advertisement" : "New Notice"}</h1>

  {#if form?.error}
    <p class="rounded-lg bg-[color:var(--color-terracotta)]/10 px-4 py-2 text-sm text-[color:var(--color-terracotta)]">
      {form.error}
    </p>
  {/if}

  <div>
    <label class="mb-1 block text-sm font-medium" for="template_id">Start from a template (optional)</label>
    <select
      id="template_id"
      name="template_id"
      bind:value={templateId}
      onchange={applyTemplate}
      class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 bg-white px-3 py-3"
    >
      <option value="">Start from scratch</option>
      {#each data.templates as t (t.id)}
        <option value={t.id}>{t.name}</option>
      {/each}
    </select>
  </div>

  <div>
    <label class="mb-1 block text-sm font-medium" for="category">Category</label>
    <select
      id="category"
      name="category"
      bind:value={category}
      class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 bg-white px-3 py-3"
    >
      <option value="notice">Notice</option>
      <option value="event">Event</option>
      <option value="advertisement">Advertisement</option>
      <option value="emergency">Emergency Alert (bypasses approval)</option>
    </select>
  </div>

  <div>
    <label class="mb-1 block text-sm font-medium" for="title">Title</label>
    <input
      id="title"
      name="title"
      type="text"
      bind:value={title}
      required
      class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 bg-white px-3 py-3"
    />
  </div>

  <div>
    <label class="mb-1 block text-sm font-medium" for="body">Body</label>
    <textarea
      id="body"
      name="body"
      rows="6"
      bind:value={body}
      required
      class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 bg-white px-3 py-3"
    ></textarea>
  </div>

  <fieldset>
    <legend class="mb-1 text-sm font-medium">Send to</legend>
    {#if data.targets.length === 0}
      <p class="text-sm text-[color:var(--color-ink-green)]/60">
        No WhatsApp groups configured yet — add them in Settings once they're onboarded (Rollout &amp; Launch Gate).
      </p>
    {/if}
    <div class="flex flex-col gap-2">
      {#each data.targets as target (target.id)}
        <label class="flex items-center gap-2 rounded-lg border border-[color:var(--color-ink-green)]/20 bg-white px-3 py-2">
          <input type="checkbox" name="target_ids" value={target.id} />
          {target.target_name}
        </label>
      {/each}
      <label class="flex items-center gap-2 rounded-lg border border-dashed border-[color:var(--color-marigold)] bg-white px-3 py-2">
        <input type="checkbox" name="mygate_reminder" bind:checked={mygateReminder} />
        Remember to post to MyGate after sending (manual — tap for ready-to-paste text)
      </label>
    </div>
  </fieldset>

  <div class="flex flex-col gap-2 sm:flex-row">
    <button
      type="submit"
      formaction="?/save_draft"
      class="rounded-lg border-2 border-[color:var(--color-ink-green)] px-4 py-3 font-medium"
    >
      Save Draft
    </button>
    <button
      type="submit"
      formaction="?/submit_for_approval"
      class="rounded-lg bg-[color:var(--color-ink-green)] px-4 py-3 font-medium text-white"
    >
      Submit for Approval
    </button>
  </div>
</form>
{/key}
