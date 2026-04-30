import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: ".",
  base: "./",
  resolve: {
    alias: {
      "@main": resolve(projectRoot, "src/main"),
      "@preload": resolve(projectRoot, "src/preload"),
      "@renderer": resolve(projectRoot, "src/renderer"),
      "@shared": resolve(projectRoot, "src/shared")
    }
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, "index.html")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  }
});
