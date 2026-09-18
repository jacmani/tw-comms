<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const statusChip: Record<string, string> = {
    opted_in: "bg-[color:var(--color-ink-green)]/15 text-[color:var(--color-ink-green)]",
    opted_out: "bg-[color:var(--color-terracotta)]/15 text-[color:var(--color-terracotta)]",
    unknown: "bg-gray-200 text-gray-700",
  };
</script>

<svelte:head>
  <title>Consent — TWAOA Comms</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <div>
    <h1 class="text-xl font-bold">Resident WhatsApp Consent</h1>
    <p class="mt-1 text-sm text-[color:var(--color-ink-green)]/70">
      Tracking only — the actual opt-in collection policy/flow is still a committee decision
      (DPDP Act requires explicit, channel-specific consent). This screen just records what's
      already known.
    </p>
  </div>

  <form
    method="POST"
    action="?/record"
    use:enhance
    class="flex flex-col gap-3 rounded-xl border border-[color:var(--color-ink-green)]/15 bg-white p-4 sm:flex-row sm:items-end"
  >
    {#if form?.error}
      <p class="text-sm text-[color:var(--color-terracotta)]">{form.error}</p>
    {/if}
    <div class="flex-1">
      <label class="mb-1 block text-sm font-medium" for="resident_identifier">Resident (phone/flat)</label>
      <input
        id="resident_identifier"
        name="resident_identifier"
        required
        class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2"
      />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium" for="status">Status</label>
      <select id="status" name="status" class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2">
        <option value="opted_in">Opted in</option>
        <option value="opted_out">Opted out</option>
        <option value="unknown">Unknown</option>
      </select>
    </div>
    <div class="flex-1">
      <label class="mb-1 block text-sm font-medium" for="notes">Notes</label>
      <input id="notes" name="notes" class="w-full rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2" />
    </div>
    <button type="submit" class="rounded-lg bg-[color:var(--color-ink-green)] px-4 py-2 font-medium text-white">
      Record
    </button>
  </form>

  <div class="overflow-x-auto rounded-xl border border-[color:var(--color-ink-green)]/15 bg-white">
    <table class="w-full min-w-[420px] text-sm">
      <thead>
        <tr class="border-b border-[color:var(--color-ink-green)]/10 text-left">
          <th class="px-3 py-2">Resident</th>
          <th class="px-3 py-2">Status</th>
          <th class="px-3 py-2">Notes</th>
          <th class="px-3 py-2">Recorded</th>
        </tr>
      </thead>
      <tbody>
        {#each data.entries as e (e.id)}
          <tr class="border-b border-[color:var(--color-ink-green)]/5">
            <td class="px-3 py-2 font-medium">{e.resident_identifier}</td>
            <td class="px-3 py-2"><span class="rounded-full px-2 py-0.5 text-xs {statusChip[e.status]}">{e.status}</span></td>
            <td class="px-3 py-2 text-[color:var(--color-ink-green)]/70">{e.notes ?? ""}</td>
            <td class="px-3 py-2 text-[color:var(--color-ink-green)]/60">{new Date(e.recorded_at).toLocaleDateString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
