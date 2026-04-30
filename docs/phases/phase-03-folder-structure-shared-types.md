# PHASE 3 - Folder Structure and Shared Types

## Active Agent

Tech Lead Orchestrator

## Objective

Create the real codebase foundation for File System Engine. This phase establishes package metadata, TypeScript configuration, source folders, shared product constants, provider-safe domain types, and typed IPC contracts. Later phases must import these contracts rather than creating parallel shapes.

## Files Created or Changed

- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `tsconfig.web.json`
- `src/main/README.md`
- `src/preload/README.md`
- `src/renderer/README.md`
- `src/shared/constants/app.ts`
- `src/shared/types/platform.ts`
- `src/shared/types/provider.ts`
- `src/shared/types/device.ts`
- `src/shared/types/file.ts`
- `src/shared/types/document.ts`
- `src/shared/types/ai.ts`
- `src/shared/types/duplicates.ts`
- `src/shared/types/operations.ts`
- `src/shared/types/scan.ts`
- `src/shared/types/index.ts`
- `src/shared/ipc/channels.ts`
- `src/shared/ipc/contracts.ts`
- `src/shared/ipc/index.ts`
- `src/shared/index.ts`
- `docs/phases/phase-03-folder-structure-shared-types.md`

## Full Deliverable

### Package and TypeScript Foundation

The project now has package metadata under the npm package name `file-system-engine`. The scripts are intentionally narrow at this phase:

- `npm run typecheck`
- `npm run typecheck:node`
- `npm run typecheck:web`
- `npm run build`
- `npm run test`

The TypeScript configuration enables strict mode and path aliases:

- `@main/*`
- `@preload/*`
- `@renderer/*`
- `@shared/*`

Node and renderer TypeScript configurations are split so Electron main/preload code can evolve separately from browser UI code.

Dependencies are installed and locked. Parser implementation dependencies are kept conservative in this phase; XLSX parsing support remains a required product capability, but its concrete parser package will be selected in Phase 10 during the parsing-layer implementation.

### Folder Structure

The initial source tree is:

```text
src/
  main/
    README.md
  preload/
    README.md
  renderer/
    README.md
  shared/
    constants/
      app.ts
    ipc/
      channels.ts
      contracts.ts
      index.ts
    types/
      ai.ts
      device.ts
      document.ts
      duplicates.ts
      file.ts
      index.ts
      operations.ts
      platform.ts
      provider.ts
      scan.ts
    index.ts
```

### Product Constants

`src/shared/constants/app.ts` defines:

- product name
- app id
- required NTFS-on-macOS copy
- required Android unauthorized copy
- required duplicate reasoning copy
- supported MVP document extensions

### Shared Provider Types

`src/shared/types/provider.ts` defines the central provider model:

- `StorageProviderKind`
- `FilesystemType`
- `DeviceAccessState`
- `ProviderCapabilities`
- `MountedFilesystemDescriptor`
- `AndroidProviderDescriptor`
- `StorageProviderDescriptor`
- writable probe metadata
- Android transport and authorization states

This file preserves the product rule that mounted filesystems and Android devices are different provider-backed storage models.

### Device Types

`src/shared/types/device.ts` defines:

- `DeviceClass`
- `MountedDeviceSummary`
- `AndroidDeviceSummary`
- `StorageDeviceSummary`
- `DeviceInventory`

The inventory separates `mountedFilesystems` from `androidDevices`, while still exposing `allProviders` for shared workflows.

### File and Browse Types

`src/shared/types/file.ts` defines:

- provider-relative storage references
- file and directory entries
- file metadata
- content hash metadata
- directory listing requests and results

These types do not assume every storage target is a local path. Android paths remain provider paths.

### Document Types

`src/shared/types/document.ts` defines:

- MVP supported document types: PDF, DOCX, TXT, CSV, XLSX
- parser status
- document type detection
- extracted document records
- table summaries for CSV/XLSX

The shape reinforces parser-first AI processing.

### AI Types

`src/shared/types/ai.ts` defines:

- `LlmProviderKind`
- `LlmProviderStatus`
- AI task kinds
- AI suggestions
- document insights
- AI task request and result shapes

The status model supports no-AI mode by making model runtime availability explicit.

### Duplicate Types

`src/shared/types/duplicates.ts` defines:

- exact duplicates
- renamed duplicates
- copy/version duplicates
- near duplicates
- duplicate grouping signals
- recommendation types
- duplicate scan summary

Every group carries reason, confidence, signals, and a recommended action.

### Operation Types

`src/shared/types/operations.ts` defines:

- copy, move, rename, delete, create folder, create file
- Android pull and push operations
- operation plans
- explicit confirmation flags
- execution logs

Destructive actions are represented explicitly so the review-before-execute workflow can enforce confirmation.

### Scan Types

`src/shared/types/scan.ts` defines:

- scan jobs
- scan targets
- scan options
- scan results

Scan targets use provider references, so scans can run against local folders, external drives, or Android locations through the appropriate provider.

### IPC Contracts

`src/shared/ipc/channels.ts` and `src/shared/ipc/contracts.ts` define the initial bridge shape:

- `devices.list`
- `storage.browse`
- `scans.start`
- `scans.get`
- `duplicates.find`
- `ai.status`
- `ai.runTask`
- `operations.executePlan`

All IPC responses use `IpcResult<T>` so the renderer handles success and failure consistently.

## Notes

Phase 3 intentionally does not implement Electron startup, provider logic, database access, or UI. It creates the typed contract those phases will use.

Important constraints preserved:

- Android devices are not represented as mounted drives.
- Provider capabilities determine allowed actions.
- NTFS-on-macOS read-only behavior is represented through warnings and capability flags.
- AI availability is explicit and optional.
- File paths are provider-relative where appropriate.

## Validation Checklist

- [x] Project package is named `file-system-engine`.
- [x] Product name is File System Engine.
- [x] TypeScript strict configuration exists.
- [x] Node and renderer TS configs are split.
- [x] Shared provider types distinguish desktop filesystems from Android providers.
- [x] Android ADB states are modeled.
- [x] Filesystem types include NTFS, exFAT, FAT32, APFS, HFS+, unknown, and unsupported.
- [x] Capability flags include browse, read, write, rename, delete, create folder, preview, hash, and text extraction.
- [x] IPC contracts are typed and renderer-safe.
- [x] Review-before-execute operations are represented.
- [x] `npm install` completes and creates a lockfile.
- [x] `npm run typecheck` passes.
- [x] `npm run typecheck:node` passes.
- [x] `npm run typecheck:web` passes.
- [x] `npm audit --audit-level=high` reports zero vulnerabilities.

## Next Phase

PHASE 4 - Electron App Shell
