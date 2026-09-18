<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const statusChip: Record<string, string> = {
    draft: "bg-gray-200 text-gray-700",
    pending_approval: "bg-[color:var(--color-marigold)]/30 text-[color:var(--color-ink-green)]",
    approved: "bg-[color:var(--color-ink-green)]/15 text-[color:var(--color-ink-green)]",
    sending: "bg-[color:var(--color-marigold)]/30 text-[color:var(--color-ink-green)]",
    sent: "bg-[color:var(--color-ink-green)] text-white",
    failed: "bg-[color:var(--color-terracotta)] text-white",
    rejected: "bg-[color:var(--color-terracotta)]/20 text-[color:var(--color-terracotta)]",
  };
</script>

<svelte:head>
  <title>History — TWAOA Comms</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-xl font-bold">History</h1>
    <a
      href="/history/export{data.category ? `?category=${data.category}` : ''}"
      class="rounded-lg border border-[color:var(--color-ink-green)]/30 px-3 py-2 text-sm"
    >
      ⬇ Export CSV
    </a>
  </div>

  <div class="flex gap-2 overflow-x-auto text-sm">
    {#each [null, "notice", "event", "advertisement", "emergency"] as c}
      <a
        href={c ? `?category=${c}` : "?"}
        class="whitespace-nowrap rounded-full px-3 py-1 {data.category === c ? 'bg-[color:var(--color-ink-green)] text-white' : 'bg-white'}"
      >
        {c ?? "All"}
      </a>
    {/each}
  </div>

  <!-- Dense table pattern, deliberately the one screen where that's appropriate
       per the UI doc §3.5. Calendar heatmap intentionally not included — see
       +page.server.ts's comment on why the water-app component wasn't pulled in. -->
  <div class="overflow-x-auto rounded-xl border border-[color:var(--color-ink-green)]/15 bg-white">
    <table class="w-full min-w-[480px] text-sm">
      <thead>
        <tr class="border-b border-[color:var(--color-ink-green)]/10 text-left">
          <th class="px-3 py-2">Title</th>
          <th class="px-3 py-2">Status</th>
          <th class="px-3 py-2">Sent to</th>
          <th class="px-3 py-2">Date</th>
        </tr>
      </thead>
      <tbody>
        {#each data.notices as n (n.id)}
          <tr class="border-b border-[color:var(--color-ink-green)]/5">
            <td class="px-3 py-2 font-medium">{n.title}</td>
            <td class="px-3 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs {statusChip[n.status]}">{n.status}</span>
            </td>
            <td class="px-3 py-2">{n.target_groups.length}</td>
            <td class="px-3 py-2 text-[color:var(--color-ink-green)]/60">
              {new Date(n.created_at).toLocaleDateString()}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
