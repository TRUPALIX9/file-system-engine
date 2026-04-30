# PHASE 5 + PHASE 6 - IPC Contracts and Desktop Filesystems

## Active Agent

Preload and IPC Engineer + Desktop Filesystem Engineer

## Objective

Combine Phase 5 and Phase 6 into one implementation pass. This phase hardens renderer-to-main communication with runtime IPC validation and replaces the Phase 4 stub device inventory with real mounted filesystem detection and desktop directory browsing.

## Files Created or Changed

- `.github/workflows/ci.yml`
- `README.md`
- `index.html`
- `public/favicon.svg`
- `src/main/app/AppError.ts`
- `src/main/app/ipcResult.ts`
- `src/main/app/registerIpc.ts`
- `src/main/devices/deviceService.ts`
- `src/main/devices/driveDetector.ts`
- `src/main/devices/platform.ts`
- `src/main/providers/DesktopFilesystemProvider.ts`
- `src/main/providers/StorageProvider.ts`
- `src/main/providers/providerRegistry.ts`
- `src/main/security/ipcValidation.ts`
- `src/main/security/pathValidation.ts`
- `src/renderer/App.tsx`
- `src/renderer/styles/app.css`
- `src/shared/index.ts`
- `src/shared/ipc/contracts.ts`
- `src/shared/ipc/errors.ts`
- `src/shared/ipc/index.ts`
- `src/shared/validation/ipcSchemas.ts`
- `src/shared/validation/ipcSchemas.test.ts`
- `docs/phases/phase-05-06-ipc-contracts-desktop-filesystems.md`

## Full Deliverable

### Phase 5: Preload and IPC Contracts

The IPC layer now validates every renderer request before main-process handlers run.

Added:

- shared IPC error codes
- `AppError` for typed main-process failures
- `IpcFailure.error.code` typed as `IpcErrorCode`
- zod request schemas for every IPC channel
- `validateIpcRequest` at the IPC boundary
- tests proving schemas accept valid browse payloads, reject unknown fields, and cover every declared channel

The renderer still receives only the `fileSystemEngine` preload API. It cannot access Node.js, shell commands, filesystem APIs, or ADB directly.

### Phase 6: Desktop Drive Detection and Filesystem Support

The main process now detects mounted desktop filesystems and exposes them as `desktop-filesystem` providers.

Implemented:

- platform detection for macOS, Windows, Linux, and unknown
- macOS/Linux mount parsing through fixed `mount` command execution
- Windows drive-letter probing
- filesystem type mapping for NTFS, exFAT, FAT32, APFS, HFS+, unknown, and unsupported
- storage usage detection through `statfs`
- access-based writable/read-only capability assignment
- provider capability flags for browsing, reading, writing, renaming, deleting, folder creation, preview, hashing, and text extraction
- mounted filesystem provider registry
- provider-scoped desktop directory browsing
- path containment checks so a browse request cannot escape the selected provider root

The app still treats Android as a separate provider class. Phase 6 does not pretend Android devices are mounted drives.

### Renderer Updates

The renderer now displays real provider inventory when running inside Electron:

- mounted filesystem list in the sidebar
- selected provider details
- filesystem type
- access state
- total and available capacity
- provider warnings
- directory entries with kind, size, and modified time
- directory click-to-browse

When opened directly in the browser through Vite, the renderer keeps using the browser-preview fallback because local filesystem access must remain in Electron main.

### Safety and Product Truth

- Renderer payloads are runtime validated.
- Unknown IPC fields are rejected.
- Browse paths are constrained to their provider root.
- Android remains separate from mounted filesystem providers.
- NTFS-on-macOS warnings are surfaced conservatively when an NTFS volume is detected as read-only.
- Write actions are capability-driven and remain read-only when provider access is read-only.

## Notes

Phase 7 should deepen writable detection by adding safe temporary write probes and the full NTFS driver-assist flow. Phase 6 currently uses permission/access checks and provider capabilities.

Windows filesystem type detection is conservative in this phase. It enumerates accessible drive roots and leaves filesystem type as `unknown` until a later Windows-specific detector is added.

## Validation Checklist

- [x] Every IPC request goes through runtime validation.
- [x] Unknown IPC request fields are rejected.
- [x] IPC error codes are typed.
- [x] Mounted filesystems are exposed as `desktop-filesystem` providers.
- [x] Android devices remain a separate provider model.
- [x] Filesystem type mapping includes NTFS, exFAT, FAT32, APFS, HFS+, unknown, and unsupported.
- [x] Directory browsing is provider-scoped.
- [x] Renderer can show provider inventory and directory entries.
- [x] `npm run typecheck` passes.
- [x] `npm run typecheck:node` passes.
- [x] `npm run typecheck:web` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `npm audit --audit-level=high` reports zero vulnerabilities.

## Next Phase

PHASE 7 - Writable Detection and NTFS Driver Assist
