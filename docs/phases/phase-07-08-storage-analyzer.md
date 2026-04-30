# PHASE 7 + PHASE 8 + Storage Analyzer v1

## Active Agent

Desktop Filesystem Engineer + File Operations Engineer + React UI Engineer

## Objective

Implement writable detection and NTFS driver assist, add desktop file operations, add macOS Finder tag reads, and introduce a WizTree-inspired storage analyzer for selected desktop folders such as Downloads.

## Files Created or Changed

- `README.md`
- `docs/phases/phase-07-08-storage-analyzer.md`
- `src/main/devices/deviceService.ts`
- `src/main/devices/driveDetector.ts`
- `src/main/file-ops/fileOperationService.ts`
- `src/main/storage/macTags.ts`
- `src/main/storage/storageAnalysisService.ts`
- `src/main/providers/DesktopFilesystemProvider.ts`
- `src/main/app/registerIpc.ts`
- `src/preload/fileSystemEngineApi.ts`
- `src/renderer/App.tsx`
- `src/renderer/api/fileSystemEngineClient.ts`
- `src/renderer/styles/app.css`
- `src/shared/ipc/channels.ts`
- `src/shared/ipc/contracts.ts`
- `src/shared/types/analysis.ts`
- `src/shared/types/device.ts`
- `src/shared/types/file.ts`
- `src/shared/types/index.ts`
- `src/shared/types/operations.ts`
- `src/shared/types/provider.ts`
- `src/shared/validation/ipcSchemas.ts`
- `src/shared/validation/ipcSchemas.test.ts`

## Full Deliverable

### Phase 7: Writable Detection and NTFS Driver Assist

Writable detection now uses:

- access checks
- safe temporary write probes for non-system mounted paths and known folders
- immediate best-effort cleanup of probe files
- capability updates based on actual writable state

If File System Engine detects macOS + NTFS + read-only, the provider receives:

- `accessState: "read-only"`
- write operations disabled through provider capabilities
- an `ntfs-read-only-macos` warning
- the required product copy
- a driver-assist link exposed through a safe `app.openExternal` IPC channel

The app still never claims it can silently enable NTFS write support.

### Phase 8: Desktop File Operations

Desktop file operations now execute in the Electron main process:

- copy
- move
- rename
- delete to Trash
- create folder
- create file contract support

Operations are provider-scoped and validated:

- renderer sends structured operation plans, not shell commands
- IPC runtime validation rejects malformed operations
- paths must remain inside their provider root
- write actions require writable provider capabilities
- destructive actions require confirmation

Android push/pull operations remain typed but intentionally return not implemented until the Android phase.

### macOS Tags

The desktop provider reads macOS Finder tags through `mdls` when running on macOS and attaches them to file metadata.

Tag writing is also routed through the main process on macOS by creating a temporary binary plist with `plutil` and applying it with `xattr`. Non-macOS platforms ignore tag writes.

### Folder Workspaces

Known folders are now exposed separately from mounted filesystems:

- Home
- Downloads
- Documents
- Desktop

The UI highlights these as folder workspaces so Downloads can be analyzed directly without browsing the whole drive first.

### Storage Analyzer v1

The analyzer is WizTree-inspired and cross-platform:

- scans a selected folder/provider path
- totals file and folder sizes
- lists largest files
- lists smallest files
- groups redundant-looking candidates by normalized name and size
- summarizes extension usage
- produces treemap-style folder chart data
- supports name/extension filtering
- caps scan entries to avoid runaway scans

This does not yet read the NTFS Master File Table directly. Direct MFT scanning is a future Windows-specific optimization; the current foundation works on macOS, Windows, Linux, external drives, and known folders through the provider abstraction.

## Notes

The in-app browser/Vite preview cannot show real filesystem providers because it does not have the Electron preload bridge. Use Electron to test real drive detection and file operations:

```sh
npm run dev
```

or:

```sh
npm run build
npm run start
```

## Validation Checklist

- [x] Writable detection includes safe temp write probes.
- [x] Temp probe files are cleaned up.
- [x] NTFS-on-macOS warning and driver assist copy are preserved.
- [x] External driver link opens through validated main-process IPC.
- [x] Copy, move, rename, delete, and create folder are wired.
- [x] Delete uses Trash instead of immediate permanent deletion.
- [x] Operations are structured and runtime validated.
- [x] Known folders include Downloads as a separate workspace.
- [x] Storage analyzer lists largest and smallest files.
- [x] Storage analyzer includes redundant candidates.
- [x] Storage analyzer includes chart/treemap data.
- [x] macOS Finder tags are read when available.
- [x] macOS Finder tags can be set through main-process operations.
- [x] `npm run typecheck` passes.
- [x] `npm run typecheck:node` passes.
- [x] `npm run typecheck:web` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.

## Next Phase

PHASE 9 - Android Device Integration via ADB
