import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function productionCspPlugin(): PluginOption {
  return {
    name: "file-system-engine-production-csp",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html.replace(
          "<head>",
          `<head>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self';"
    />`
        )
    }
  };
}

export default defineConfig({
  plugins: [react(), productionCspPlugin()],
  root: ".",
  base: "./",
  publicDir: resolve(projectRoot, "public"),
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
