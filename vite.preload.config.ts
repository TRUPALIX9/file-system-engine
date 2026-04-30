import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const preloadExternals = ["electron", ...builtinModules, ...builtinModules.map((mod) => `node:${mod}`)];
const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@main": resolve(projectRoot, "src/main"),
      "@preload": resolve(projectRoot, "src/preload"),
      "@renderer": resolve(projectRoot, "src/renderer"),
      "@shared": resolve(projectRoot, "src/shared")
    }
  },
  build: {
    outDir: "dist/preload",
    emptyOutDir: true,
    target: "node22",
    lib: {
      entry: resolve(projectRoot, "src/preload/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.cjs"
    },
    rollupOptions: {
      external: preloadExternals,
      output: {
        entryFileNames: "index.cjs"
      }
    }
  }
});
