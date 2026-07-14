import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/dashboard",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve("index.html"),
        legacy: path.resolve("legacy.html"),
      },
    },
  },
});
