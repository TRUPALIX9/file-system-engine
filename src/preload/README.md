# Preload

The preload layer exposes the narrow `fileSystemEngine` API through Electron `contextBridge`.

Responsibilities:
- map renderer API calls to typed IPC channels
- expose only the methods declared in `src/shared/ipc/contracts.ts`
- avoid leaking Node.js or Electron internals to the renderer

