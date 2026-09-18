<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";
  import type { Snippet } from "svelte";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  // Spec §2's top nav is Compose/Templates/History/Reports/Bot Status — Reports is
  // Phase 5 scope (not built this session), swapped here for Settings (Phase 4
  // provider config) and Consent (the 2026-08-26 audit gap), both real screens
  // this session actually built.
  const navItems = [
    { href: "/", label: "Compose" },
    { href: "/templates", label: "Templates" },
    { href: "/history", label: "History" },
    { href: "/bot-status", label: "Bot Status" },
    { href: "/settings", label: "Settings" },
    { href: "/consent", label: "Consent" },
  ];

  const dotColor: Record<string, string> = {
    green: "bg-[color:var(--color-health-green)]",
    amber: "bg-[color:var(--color-health-amber)]",
    red: "bg-[color:var(--color-health-red)]",
  };
</script>

{#if data.showNav}
  <div class="min-h-screen pb-16 md:pb-0">
    <header class="sticky top-0 z-10 border-b border-[color:var(--color-ink-green)]/15 bg-[color:var(--color-parchment)]/95 px-4 py-3 backdrop-blur">
      <div class="mx-auto flex max-w-4xl items-center justify-between">
        <a href="/" class="text-lg font-bold">TWAOA Comms</a>
        <a
          href="/bot-status"
          class="flex items-center gap-2 text-sm"
          title={data.botHealth?.label ?? "Bot status"}
        >
          <span
            class="inline-block h-3 w-3 rounded-full {dotColor[data.botHealth?.light ?? 'red']}"
            aria-hidden="true"
          ></span>
          <span class="hidden sm:inline">{data.botHealth?.label}</span>
        </a>
      </div>
      <!-- Slim top nav on desktop; a bottom tab bar on mobile (below) covers the same
           destinations one-handed, per the "mobile-first, not responsive-as-afterthought"
           principle (02-ui-design.md §1). -->
      <nav class="mx-auto mt-2 hidden max-w-4xl gap-4 text-sm md:flex">
        {#each navItems as item}
          <a
            href={item.href}
            class="rounded px-2 py-1 {$page.url.pathname === item.href ? 'bg-[color:var(--color-ink-green)] text-white' : 'hover:bg-black/5'}"
          >
            {item.label}
          </a>
        {/each}
      </nav>
    </header>

    <main class="mx-auto max-w-4xl px-4 py-6">
      {@render children()}
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-[color:var(--color-ink-green)]/15 bg-[color:var(--color-parchment)] py-2 md:hidden"
      style="padding-bottom: env(safe-area-inset-bottom, 0px);"
    >
      {#each navItems as item}
        <a
          href={item.href}
          class="flex-1 rounded px-1 py-2 text-center text-xs {$page.url.pathname === item.href ? 'font-bold text-[color:var(--color-ink-green)]' : 'text-[color:var(--color-ink-green)]/70'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
{:else}
  {@render children()}
{/if}
