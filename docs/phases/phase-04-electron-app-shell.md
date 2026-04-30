# PHASE 4 - Electron App Shell

## Active Agent

Electron Main Engineer

## Objective

Create the first runnable Electron shell for File System Engine. This phase adds build scripts, Vite configuration, a secure main process window, a preload bridge, stub IPC handlers, and a React workspace screen that reflects the product architecture without implementing provider services yet.

## Files Created or Changed

- `README.md`
- `.github/workflows/ci.yml`
- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `vite.main.config.ts`
- `vite.preload.config.ts`
- `scripts/dev.mjs`
- `src/main/index.ts`
- `src/main/app/createWindow.ts`
- `src/main/app/ipcResult.ts`
- `src/main/app/registerIpc.ts`
- `src/preload/index.ts`
- `src/preload/fileSystemEngineApi.ts`
- `src/renderer/App.tsx`
- `src/renderer/api/fileSystemEngineClient.ts`
- `src/renderer/main.tsx`
- `src/renderer/styles/app.css`
- `src/renderer/vite-env.d.ts`
- `docs/phases/phase-04-electron-app-shell.md`

## Full Deliverable

### Build and Dev Scripts

The project now has runnable shell scripts:

- `npm run dev`
- `npm run build:main`
- `npm run build:preload`
- `npm run build:renderer`
- `npm run build`
- `npm run start`

`scripts/dev.mjs` builds main and preload bundles, starts the Vite renderer dev server, waits for it to respond, then launches Electron with `VITE_DEV_SERVER_URL`.

### GitHub CI

`.github/workflows/ci.yml` validates the repository on pushes and pull requests to `main`:

- `npm ci`
- `npm run build`
- `npm audit --audit-level=high`

### Electron Main Process

`src/main/index.ts` owns application lifecycle:

- single-instance lock
- IPC registration
- default permission denial
- macOS activate behavior
- clean quit on non-macOS platforms

`src/main/app/createWindow.ts` creates the main BrowserWindow with:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- preload path pointed at the built preload bundle
- external link opening through the OS browser only for `https://`
- navigation blocking outside the current loaded page
- production renderer build injects a restrictive Content Security Policy while dev preview stays compatible with Vite

### IPC Handler Stubs

`src/main/app/registerIpc.ts` registers the Phase 3 IPC contracts:

- devices list
- storage browse
- scan start/get
- duplicate find
- AI status/run task
- operation plan execution

Handlers return typed stub data until the provider, service, database, and AI phases implement real behavior.

### Preload API

`src/preload/fileSystemEngineApi.ts` exposes only the typed `fileSystemEngine` API through `contextBridge`.

The renderer receives:

- `devices.list`
- `storage.browse`
- `scans.start`
- `scans.get`
- `duplicates.find`
- `ai.status`
- `ai.runTask`
- `operations.executePlan`

The renderer does not receive Node.js, Electron internals, filesystem access, shell access, or ADB access.

### Renderer Shell

`src/renderer/App.tsx` creates the first operational workspace:

- left sidebar for mounted filesystems and Android devices
- center workspace with provider browser surface
- right panel with security, NTFS, and Android rules
- status cards for mounted providers, Android providers, scan jobs, and AI runtime
- refresh action wired to the preload API

`src/renderer/api/fileSystemEngineClient.ts` provides a browser-preview fallback when the renderer is opened outside Electron. Electron still uses the real preload API.

### Product Rules Preserved

- Android devices remain separate from mounted filesystems.
- Provider inventory has separate mounted filesystem and Android lists.
- NTFS-on-macOS copy is present and conservative.
- AI availability is explicit and can be missing.
- Renderer never directly accesses Node.js or ADB.

## Notes

Phase 4 intentionally keeps provider behavior stubbed. Desktop drive detection begins in Phase 6, Android ADB begins in Phase 9, and AI implementation begins in Phase 12.

The UI is a real shell rather than a landing page. It is ready to receive provider inventories and scan results in later phases.

## Validation Checklist

- [x] Electron main process exists.
- [x] Secure BrowserWindow settings are configured.
- [x] Preload bridge exposes only typed API methods.
- [x] IPC handlers are registered for every Phase 3 contract.
- [x] React renderer mounts successfully.
- [x] Browser-preview fallback exists for Vite renderer testing.
- [x] GitHub CI workflow is configured.
- [x] Product name is File System Engine.
- [x] `npm install` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run typecheck:node` passes.
- [x] `npm run typecheck:web` passes.
- [x] `npm run build` passes.
- [x] `npm audit --audit-level=high` reports zero vulnerabilities.

## Next Phase

PHASE 5 - Preload and IPC Contracts
