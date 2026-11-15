import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// Source lives in site/. Output has fixed names so scripts/build.sh can
// copy it into dist/ by name.
export default defineConfig({
  root: "site",
  publicDir: false,
  plugins: [svelte()],
  build: {
    outDir: "../build",
    emptyOutDir: true,
    assetsDir: "",
    modulePreload: false,
    rolldownOptions: {
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "app-[name].js",
        assetFileNames: "app[extname]",
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
