import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // adapter-auto picks the right adapter for the eventual host (Vercel, Node
    // VM, etc.) — hosting itself is still an open decision (ClickUp 86d44wmd2).
    adapter: adapter(),
    env: {
      // `svelte-kit sync`/svelte-check resolve $env/static/* through THIS setting,
      // separately from vite.config.ts's `envDir` (which only governs the actual
      // dev/build run) — both need to point at the same root .env or type
      // generation and the runtime disagree about which vars exist.
      dir: path.resolve(__dirname, "../.."),
    },
  },
};

export default config;
