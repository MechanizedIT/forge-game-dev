import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: { output: { entryFileNames: "assets/showcase-[hash].js", assetFileNames: "assets/showcase-[hash][extname]" } },
  },
  server: { host: "127.0.0.1", port: 4183 },
  preview: { host: "127.0.0.1", port: 4184 },
});
