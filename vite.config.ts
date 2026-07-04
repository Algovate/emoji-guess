import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({ targets: [{ src: "manifest.json", dest: "." }] }),
  ],
  build: {
    rollupOptions: {
      input: { sidepanel: "sidepanel.html", game: "game.html" },
      output: { entryFileNames: "assets/[name].js", chunkFileNames: "assets/[name]-[hash].js" },
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.ts"] },
});
