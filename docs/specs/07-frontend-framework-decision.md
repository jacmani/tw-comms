# TWAOA FM Communication Tool — Frontend Framework Decision

**Document 7** · Companion to `01`–`06`
**Question addressed:** Why Next.js, and is there something lighter/more current that fits this specific tool better?
**Date:** August 2026

---

## 1. Honest answer to "why Next.js" — it was inherited, not chosen

Next.js was in the original spec for one real reason: it's what `tw-water-automation` already uses, and reuse was the whole point of sharing infrastructure. That's a legitimate reason to *default* to it, but it's worth separating from "it's the right tool for this specific job" — those aren't automatically the same thing, and your question is fair to ask before locking it in for a second project.

**What actually matters for the FM dashboard, per the UI design doc already written:** a single non-technical user, mobile-first, one-handed, on an ordinary phone, often on regular 4G rather than fast wifi, doing a small number of focused actions (compose, check status, approve). That profile is genuinely closer to "lightweight app that needs to feel instant on a phone" than to "content platform that needs SEO and server-rendered marketing pages" — which is the profile Next.js is actually optimized for.

---

## 2. What the research says, directly

The clearest signal across current sources: **admin dashboards and internal tools are explicitly called out as a case where Next.js's server-rendering machinery "adds complexity without value."** That's not a knock on Next.js generally — it's a specific mismatch between what Next.js is built to optimize (SEO, marketing pages, content platforms) and what this tool actually is (a private, logged-in, single-user workflow app with no public pages and no SEO need at all).

**On the performance numbers specifically, comparing Next.js against SvelteKit (the most-cited lightweight alternative):**

- Baseline JavaScript shipped to the browser: a basic Next.js app runs roughly 85–130KB gzipped due to React's runtime overhead, versus roughly 3–5KB for an equivalent basic SvelteKit app, since Svelte compiles away its framework at build time rather than shipping a runtime to the browser.
- On a realistic CRUD-style app (closer to what the Compose/History/Templates screens actually are), the gap narrows but stays large: roughly 240KB gzipped for Next.js versus roughly 85KB for SvelteKit.
- Server-side: in a stress test on a basic $6 VPS, SvelteKit handled about 1,200 requests/second versus Next.js's 850 — roughly 40% more headroom on the same cheap hardware, which matters directly against the infrastructure cost report's goal of keeping hosting cheap.
- The practical framing that shows up repeatedly: this difference is "the literal difference between an instant feel and a 3-second lag" specifically for **mobile users on patchy or slower connections** — which is exactly the FM's real usage pattern (phone, at the gate, possibly mid-walkthrough, not sitting on office wifi).

**Where this cuts the other way — the one real cost of switching:**

- Next.js's ecosystem is larger, and AI coding tools reportedly generate cleaner output for React/Next.js specifically because they have more training data to draw from — this is a real, if soft, cost given that Claude Code is how this gets built. Vue and Svelte's smaller, more opinionated codebases are noted to produce cleaner AI-generated output *within* those frameworks (less variance to hallucinate around), but there's simply less of it in the training corpus overall compared to React.
- Claude Code's plugin ecosystem (LSP, Frontend Design, Chrome DevTools MCP, Vercel deploy-awareness) explicitly supports both Next.js and SvelteKit as first-class targets — so this isn't a tooling blocker, just a "slightly more well-trodden path" argument for Next.js.
- SvelteKit's third-party library ecosystem is smaller than React's — relevant if the dashboard ever needed something exotic, but everything already scoped in the UI design doc (charts, a calendar heatmap, CSV export, forms) has straightforward Svelte equivalents; nothing in the spec needs a React-only library.

---

## 3. Applying this specifically to what's already been spec'd

Going through the UI design doc's actual component list, checking whether anything is Next.js-specific or would be harder in SvelteKit:

| Component (from `02-ui-design.md`) | Next.js-specific? | SvelteKit fit |
|---|---|---|
| Compose flow (5-step form) | No | Straightforward — SvelteKit's form actions are noted as a particular strength for exactly this kind of multi-step form flow |
| Templates CRUD | No | Straightforward |
| History (calendar heatmap, filters, CSV export) | No — these are all plain JS/chart-library concerns | Equivalent charting libraries exist in the Svelte ecosystem; CSV export is trivial vanilla JS either way |
| Bot Status (traffic light + live state) | No | Fine — this is really just a polling/websocket UI concern, framework-agnostic |
| Poster generator + `html-to-image` pipeline | No — `html-to-image` is a vanilla JS library, not React-specific | Works identically |
| Reports screen (charts) | No | Same as History |

**Nothing in the actual spec depends on a Next.js-specific feature.** The original "reuse the water project's components" rationale (design tokens, calendar heatmap pattern, `html-to-image` pipeline) mostly refers to *patterns and design tokens*, not literal component code that would need React specifically — Tailwind config and color/spacing tokens port directly to any framework, and the `html-to-image` poster pipeline is plain JavaScript either way.

**One place reuse genuinely favors Next.js:** if any actual React *component code* (not just patterns) gets copy-pasted from `tw-water-automation` rather than rebuilt, that only works if this project also uses React/Next.js. Worth checking how much of the water app's dashboard is meant to be literally reused vs. referenced as a pattern — if it's mostly the latter (which the UI doc's phrasing suggests — "reuse the calendar-heatmap *pattern*"), this doesn't meaningfully favor either framework.

---

## 4. Recommendation

**Switch to SvelteKit for this project specifically**, while keeping Next.js for `tw-water-automation` as-is (no reason to touch a working system). This is a case where the two projects sharing a Supabase project doesn't require them to share a frontend framework — they're separate repos, separate deploys, and the only shared layer is the database and design tokens, both of which are framework-agnostic.

**Why this fits better than defaulting to Next.js:**
1. The FM's actual usage pattern (mobile, one-handed, possibly patchy connectivity) is precisely the case where SvelteKit's smaller bundle size and faster interaction response translate into a noticeably better day-to-day experience, not just a benchmark number.
2. Cheaper to host at the margin — the infrastructure cost report already found bot-hosting to be the more uncertain cost line; a framework that handles more requests/second on the same cheap VPS is a small but real hedge in the same direction as that report's cost-consciousness.
3. Nothing in the already-written spec or UI design doc actually requires Next.js-specific features — this isn't a retrofit, it's confirming the original choice wasn't load-bearing.
4. Claude Code supports SvelteKit as a first-class target via the same plugin stack (LSP, Frontend Design, deploy tooling) used for Next.js — the "AI can build it well" concern is a soft, not hard, consideration here.

**What this costs you, honestly:** a marginally less-traveled path for AI-generated edge cases, and if any literal component *code* (not just design tokens/patterns) was planned to be copy-pasted from the water project, that reuse goes away — worth a quick check on how much of that reuse was actually planned to be literal versus pattern-level before finalizing.

**If you'd rather not introduce a second frontend framework into the TWAOA ecosystem at all** — a real, legitimate reason to stick with Next.js despite the above — that's a reasonable call too, and the performance gap, while real, is not so large that it would make Next.js a bad tool for this job. It would just be a slightly heavier one for a tool whose primary user is on a phone.

---

## 5. If you go with SvelteKit — what changes in the existing docs

Minimal, since the spec was written framework-agnostically at the architecture level:

- `01-specification.md` §3.2 stack table: swap "Next.js 14 App Router" → "SvelteKit" for the `apps/web` line only; everything else (Supabase, Baileys, Resend, `html-to-image`, Gemini) is unchanged
- `02-ui-design.md`: no changes needed — it's written in terms of screens and components, not framework-specific code
- `03-build-and-test-phases.md` and `04-clickup-task-plan.md`: Phase 3 task descriptions referencing "Next.js scaffold" get relabeled "SvelteKit scaffold" — no phase restructuring needed
- Hosting: SvelteKit deploys via the same Vercel-or-VPS options already considered; no new hosting decision required

This is a low-cost pivot precisely because it's caught before Phase 3 (dashboard build) has started — worth deciding now rather than after any SvelteKit-vs-Next.js-specific code exists.
