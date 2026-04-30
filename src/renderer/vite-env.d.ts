/// <reference types="vite/client" />

import type { FileSystemEngineApi } from "@shared/ipc";

declare global {
  interface Window {
    fileSystemEngine?: FileSystemEngineApi;
  }
}

export {};
