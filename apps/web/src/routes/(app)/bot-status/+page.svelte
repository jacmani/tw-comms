<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dotColor: Record<string, string> = {
    green: "bg-[color:var(--color-health-green)]",
    amber: "bg-[color:var(--color-health-amber)]",
    red: "bg-[color:var(--color-health-red)]",
  };
</script>

<svelte:head>
  <title>Bot Status — TWAOA Comms</title>
</svelte:head>

<div class="flex flex-col items-center gap-6 py-6 text-center">
  <div class="h-24 w-24 rounded-full {dotColor[data.summary.light]}" aria-hidden="true"></div>
  <h1 class="text-2xl font-bold">{data.summary.label}</h1>

  {#if data.summary.lastEventAt}
    <p class="text-sm text-[color:var(--color-ink-green)]/60">
      Last update: {new Date(data.summary.lastEventAt).toLocaleString()}
    </p>
  {/if}

  {#if data.summary.light === "red"}
    <div class="w-full max-w-md rounded-xl border-2 border-[color:var(--color-terracotta)] bg-white p-4 text-left">
      <h2 class="mb-2 font-bold text-[color:var(--color-terracotta)]">What to do</h2>
      <ol class="list-decimal space-y-1 pl-5 text-sm">
        <li>Check the hosting VM/process is still running.</li>
        <li>If the primary number was banned, follow the spare-SIM swap procedure (see README).</li>
        <li>If it's still down after 15 minutes, escalate to the President/Secretary.</li>
      </ol>
    </div>
  {/if}

  <section class="w-full max-w-md text-left">
    <h2 class="mb-2 text-lg font-bold">Recent events</h2>
    <ul class="flex flex-col gap-2">
      {#each data.recentEvents as event (event.id)}
        <li class="rounded-lg border border-[color:var(--color-ink-green)]/15 bg-white px-3 py-2 text-sm">
          <div class="flex justify-between">
            <span class="font-medium">{event.event_type}</span>
            <span class="text-[color:var(--color-ink-green)]/60">{new Date(event.logged_at).toLocaleTimeString()}</span>
          </div>
          {#if event.event_type === "ban_suspected"}
            <p class="text-xs text-[color:var(--color-terracotta)]">
              Risk: {event.detail.risk} — {event.detail.recommendation}
            </p>
          {/if}
        </li>
      {:else}
        <li class="text-sm text-[color:var(--color-ink-green)]/60">No events recorded yet.</li>
      {/each}
    </ul>
  </section>
</div>
