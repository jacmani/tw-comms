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
  <title>Compose — TWAOA Comms</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div class="grid gap-3 sm:grid-cols-2">
    <a
      href="/compose/new?category=notice"
      class="flex items-center gap-3 rounded-xl bg-[color:var(--color-ink-green)] px-5 py-5 text-lg font-semibold text-white"
    >
      📢 New Notice
    </a>
    <a
      href="/compose/new?category=advertisement"
      class="flex items-center gap-3 rounded-xl border-2 border-[color:var(--color-marigold)] bg-white px-5 py-5 text-lg font-semibold text-[color:var(--color-ink-green)]"
    >
      💰 New Advertisement
    </a>
  </div>

  <section>
    <h2 class="mb-2 text-lg font-bold">Awaiting Approval ({data.pending.length})</h2>
    {#if data.pending.length === 0}
      <p class="text-sm text-[color:var(--color-ink-green)]/60">Nothing waiting on the committee right now.</p>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each data.pending as notice (notice.id)}
          <li class="rounded-lg border border-[color:var(--color-ink-green)]/15 bg-white px-4 py-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium">{notice.title}</span>
              <span class="rounded-full px-2 py-0.5 text-xs {statusChip[notice.status]}">{notice.status}</span>
            </div>
            <p class="text-xs text-[color:var(--color-ink-green)]/60">
              Submitted {new Date(notice.created_at).toLocaleString()}
            </p>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h2 class="mb-2 text-lg font-bold">Drafts ({data.drafts.length})</h2>
    {#if data.drafts.length === 0}
      <p class="text-sm text-[color:var(--color-ink-green)]/60">No drafts saved.</p>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each data.drafts as notice (notice.id)}
          <li class="rounded-lg border border-[color:var(--color-ink-green)]/15 bg-white px-4 py-3">
            <a href="/compose/new?id={notice.id}" class="font-medium underline">{notice.title}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h2 class="mb-2 text-lg font-bold">Recently Sent</h2>
    {#if data.recentlySent.length === 0}
      <p class="text-sm text-[color:var(--color-ink-green)]/60">Nothing sent yet.</p>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each data.recentlySent as notice (notice.id)}
          <li class="rounded-lg border border-[color:var(--color-ink-green)]/15 bg-white px-4 py-3">
            <span class="font-medium">✅ {notice.title}</span>
            <p class="text-xs text-[color:var(--color-ink-green)]/60">{notice.target_groups.length} targets</p>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
