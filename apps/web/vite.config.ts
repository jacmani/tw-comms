import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // Single .env at the repo root, same as apps/whatsapp-bot/src/config.ts — one
  // place to manage Supabase credentials instead of a second .env per app.
  envDir: path.resolve(__dirname, "../.."),
});
