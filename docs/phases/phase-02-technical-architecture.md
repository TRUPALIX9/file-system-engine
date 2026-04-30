# PHASE 2 - Technical Architecture

## Active Agent

Solution Architect

## Objective

Design the File System Engine technical architecture around a secure Electron shell, typed IPC, provider-based storage access, parser-first document processing, local AI through Ollama, duplicate analysis, and SQLite persistence. The architecture must keep mounted filesystems separate from Android devices and must enforce capability-based operations.

## Files Created or Changed

- `README.md`
- `agents/02-solution-architect.md`
- `docs/phases/phase-02-technical-architecture.md`

## Full Deliverable

### Architecture Overview

File System Engine uses Electron as the desktop shell, React as the renderer UI, TypeScript across the app, SQLite for local metadata, and Ollama for optional local AI. The system is split into explicit layers:

1. Renderer UI

   React components render device lists, drive details, file browser views, AI insights, duplicate groups, dialogs, and review workflows. The renderer cannot access Node.js directly.

2. Preload API

   A minimal `contextBridge` API exposes typed application actions such as listing devices, browsing paths, scanning folders, reviewing duplicate groups, and executing approved file operations.

3. Electron Main Process

   The main process owns IPC handlers, window lifecycle, security configuration, provider orchestration, filesystem operations, Android ADB execution, parser orchestration, AI service calls, duplicate analysis, and database access.

4. Application Services

   Services coordinate workflows such as scanning, duplicate grouping, AI suggestions, device refresh, and bulk action execution.

5. Storage Providers

   Providers expose storage operations through capability flags. Mounted filesystem devices use `DesktopFilesystemProvider`; Android devices use `AndroidAdbProvider`. Future Android MTP and cloud providers can implement the same shape.

6. Parsing Layer

   Parsers extract text and structure from PDF, DOCX, TXT, CSV, and XLSX files before AI processing.

7. AI Layer

   `LlmProvider` abstracts Ollama and future providers. AI is optional; unavailable runtime produces degraded-but-usable behavior.

8. Persistence Layer

   SQLite stores device snapshots, scan jobs, file records, extracted text summaries, duplicate groups, AI suggestions, and operation logs.

### Provider Model

All storage access goes through a provider interface. Providers report capabilities instead of the UI assuming behavior from device type.

Provider families:

- `DesktopFilesystemProvider`
  - local disks
  - external drives
  - USB drives
  - SD cards
  - normal mounted paths

- `AndroidAdbProvider`
  - Android phones and tablets over USB debugging
  - ADB device detection
  - authorization state
  - shell-backed directory listing where available
  - `adb pull` and `adb push`
  - controlled rename/delete commands where supported

- `AndroidMtpProvider` later
  - optional adapter
  - not required for MVP
  - may be platform-specific or capability-limited

- `CloudProvider` later
  - optional future abstraction

Core provider concepts:

```ts
type StorageProviderKind =
  | "desktop-filesystem"
  | "android-adb"
  | "android-mtp"
  | "cloud";

type FilesystemType =
  | "ntfs"
  | "exfat"
  | "fat32"
  | "apfs"
  | "hfs-plus"
  | "unknown"
  | "unsupported";

type DeviceAccessState =
  | "available"
  | "read-only"
  | "unauthorized"
  | "unavailable"
  | "error";

type ProviderCapabilities = {
  canBrowse: boolean;
  canRead: boolean;
  canWrite: boolean;
  canRename: boolean;
  canDelete: boolean;
  canCreateFolder: boolean;
  canStreamPreview: boolean;
  canHashDirectly: boolean;
  canRunTextExtraction: boolean;
};
```

The app must derive UI actions from provider capabilities. For example, a read-only NTFS drive on macOS returns `canWrite=false`, `canRename=false`, `canDelete=false`, and `canCreateFolder=false`. An unauthorized Android device returns `canBrowse=false` and shows the authorization message.

### Module Boundaries

Recommended implementation modules:

```text
src/
  main/
    app/
      createWindow.ts
      registerIpc.ts
    devices/
      deviceService.ts
      driveDetector.ts
      androidDetector.ts
    providers/
      StorageProvider.ts
      DesktopFilesystemProvider.ts
      AndroidAdbProvider.ts
      AndroidMtpProvider.ts
    file-ops/
      fileOperationService.ts
      operationPlanner.ts
      safetyGuards.ts
    parsing/
      parserRegistry.ts
      pdfParser.ts
      docxParser.ts
      textParser.ts
      csvParser.ts
      xlsxParser.ts
    duplicates/
      hashService.ts
      filenameNormalizer.ts
      duplicateAnalyzer.ts
      duplicateScoring.ts
    ai/
      LlmProvider.ts
      OllamaProvider.ts
      aiSuggestionService.ts
    db/
      database.ts
      schema.ts
      repositories/
    security/
      pathValidation.ts
      ipcValidation.ts
      commandValidation.ts
  preload/
    index.ts
    fileSystemEngineApi.ts
  renderer/
    App.tsx
    main.tsx
    components/
    features/
    styles/
  shared/
    types/
    ipc/
    constants/
```

Boundary rules:

- Renderer never imports Node.js APIs.
- Renderer never constructs shell commands.
- Renderer talks only to preload API.
- Main process validates every IPC payload.
- Providers enforce capabilities before operations.
- ADB command construction stays inside `AndroidAdbProvider`.
- Parser output is structured before AI receives content.
- Database writes go through repositories or service methods.

### Data Flow

#### Device Refresh

1. Renderer calls `fileSystemEngine.devices.list()`.
2. Preload forwards typed request over IPC.
3. Main process calls `DeviceService`.
4. `DeviceService` queries mounted drive detector and Android detector.
5. Each detected target is mapped to a provider descriptor and capability set.
6. Results are stored as a device snapshot in SQLite.
7. Renderer displays drives and Android devices in separate sidebar sections.

#### Browse Folder or Device Path

1. Renderer requests `browse({ providerId, path })`.
2. Main validates provider id and path shape.
3. Main resolves provider.
4. Provider lists entries and returns normalized metadata.
5. UI renders list/grid plus capability-specific actions.

#### Scan and Analyze

1. User chooses a folder, drive path, or Android path.
2. Scan service walks provider entries.
3. File records are stored in SQLite.
4. Hash service computes exact hashes where possible.
5. Parser registry extracts text/structure for supported document types.
6. Duplicate analyzer groups exact, renamed, and likely version duplicates.
7. AI suggestion service asks Ollama for categories and suggestions when available.
8. Results are displayed for review.

#### Execute Reviewed Actions

1. User selects suggested actions.
2. UI shows an explicit confirmation for destructive operations.
3. Renderer sends a typed operation plan id or action list.
4. Main validates operation permissions and current provider capabilities.
5. File operation service executes actions one by one with logging.
6. Cross-provider moves are treated as copy plus verified delete.
7. Operation results are persisted and surfaced in the UI.

### SQLite Storage Model

Core tables:

- `devices`
  - id, provider_kind, display_name, platform, filesystem_type, mount_path, android_serial, model, access_state, capabilities_json, last_seen_at

- `scan_jobs`
  - id, root_provider_id, root_path, status, started_at, completed_at, error_message

- `files`
  - id, scan_job_id, provider_id, path, name, extension, mime_type, size_bytes, modified_at, content_hash, metadata_json

- `document_extracts`
  - id, file_id, parser_type, extracted_text, page_count, table_summary_json, status, error_message

- `ai_suggestions`
  - id, file_id, task, title, summary, category, suggested_folder, suggested_filename, confidence, explanation, model, status

- `duplicate_groups`
  - id, scan_job_id, duplicate_type, confidence, reason, recommended_action

- `duplicate_group_items`
  - group_id, file_id, role, score

- `operation_logs`
  - id, operation_type, provider_id, source_path, destination_path, status, reversible, created_at, error_message

### Security Boundaries

Electron configuration:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` where compatible
- preload exposes only a minimal typed API
- disable remote module
- block unexpected navigation and new-window creation
- use a restrictive content security policy

IPC validation:

- Validate payload shape at the main process boundary.
- Validate provider ids against known registered providers.
- Validate paths according to provider rules.
- Reject path traversal attempts.
- Reject arbitrary command strings.
- Use operation ids or structured action objects, not raw shell text.

ADB command safety:

- Main process owns all ADB execution.
- Renderer cannot provide raw ADB arguments.
- Serial values come from detected devices or strict validation.
- Device paths are quoted or passed as controlled argument arrays.
- Only allow whitelisted operations: list, stat, pull, push, rename, delete, mkdir.
- Surface authorization and disconnect errors clearly.

Filesystem safety:

- Write operations require `canWrite=true`.
- Destructive operations require confirmation.
- External drives are rechecked before operation execution.
- Temporary write tests use app-namespaced temp files and immediate cleanup.
- Cross-device and cross-provider moves avoid unsafe rename assumptions.

### NTFS-on-macOS Architecture

Drive detection must determine both filesystem type and actual writable state. The decision flow:

1. Detect platform.
2. Detect filesystem label where available.
3. Check access permissions.
4. Run a safe temporary write test only when needed.
5. If platform is macOS, filesystem is NTFS, and writable is false:
   - mark drive read-only
   - disable write operations
   - show the NTFS driver-assist copy
   - offer Install Driver, Learn More, and Refresh Access actions

Install Driver opens a supported vendor page. It does not install silently and does not claim activation.

### Android ADB Architecture

`AndroidAdbProvider` owns:

- finding the `adb` executable
- checking ADB availability
- running `adb devices -l`
- mapping `device`, `unauthorized`, and offline states
- retrieving model when available
- listing accessible roots or common directories
- browsing paths with controlled shell commands
- pulling files to desktop
- pushing files to Android
- renaming and deleting with explicit capability checks
- converting ADB errors into product-level messages

Android device records remain separate from mounted drive records in the UI and database. Even if a platform exposes a phone through another integration, it should be represented as an Android provider target, not merged into the desktop filesystem provider.

### Parser-First AI Architecture

The AI layer never consumes raw binary files directly. Document flow:

1. Detect MIME/type and extension.
2. Choose parser from registry.
3. Extract text, structure, page count, and table summaries when possible.
4. Store extract in SQLite.
5. Send bounded extracted content to AI task.
6. Store structured AI result.
7. Display suggestions with confidence and explanation.

AI provider tasks:

- `classifyDocument`
- `summarizeDocument`
- `suggestFolder`
- `suggestRename`
- `compareFilesSemantically`
- `explainDuplicateGroup`

No-AI behavior:

- File browsing works.
- Drive management works.
- Android operations work.
- Hash and filename duplicate detection works.
- Parser metadata can still be stored.
- UI marks AI as unavailable and skips AI-only suggestions.

### Duplicate Detection Architecture

Duplicate grouping uses layered signals:

1. Exact duplicate
   - same content hash
   - same size

2. Renamed duplicate
   - same content hash
   - same size
   - different filename

3. Copy/version duplicate
   - normalized filename similarity
   - version suffix patterns
   - size similarity
   - matching extension or compatible document type

4. Near duplicate later
   - extracted text similarity
   - embedding similarity
   - semantic comparison through AI provider

The UI must show a reason and confidence for each group and require review before deletion or movement.

### UI Architecture

Primary layout:

- left sidebar: local roots, external drives, Android devices, saved scans
- center panel: file browser, scan results, duplicate groups, review queues
- right panel: metadata, preview summary, AI insights, duplicate reasoning, device warnings
- bottom or top toolbar: bulk actions and current operation status

Important UI states:

- writable drive
- read-only drive
- NTFS on macOS
- Android connected
- Android unauthorized
- Android offline
- duplicate group
- near duplicate group
- AI unavailable
- AI suggested
- operation pending
- operation failed

### Packaging Strategy

Development:

- Electron + Vite dev server
- TypeScript strict mode
- unit tests for providers, path validation, duplicate logic, and parser registry
- integration tests for IPC handlers with mocked providers

Distribution:

- package macOS and Windows builds with electron-builder or Electron Forge
- macOS notarization to be added before public release
- Windows code signing to be added before public release
- bundle no local AI model by default unless explicitly licensed and sized
- detect Ollama runtime rather than requiring it
- document optional ADB setup or bundle a controlled platform-specific ADB binary later after licensing review

Release checks:

- app launches on macOS and Windows
- renderer has no Node.js access
- external drive read-only handling works
- NTFS-on-macOS driver-assist copy appears only for the correct condition
- Android unauthorized state appears clearly
- no-AI mode works
- scan and duplicate review flow works on sample fixtures

## Notes

Phase 2 establishes the implementation map. Phase 3 should convert these concepts into concrete shared TypeScript types, IPC contracts, and the initial folder structure.

Architecture guardrails:

- Providers are capability-driven.
- Android is not a mounted-drive special case.
- File System Engine does not overclaim NTFS write support.
- AI is optional and parser-first.
- Renderer is untrusted and narrow by design.

## Validation Checklist

- [x] Electron, React, TypeScript, Vite, SQLite, and Ollama are included.
- [x] Provider abstraction separates desktop filesystems from Android ADB.
- [x] Capability flags drive UI and operation availability.
- [x] Secure preload and IPC boundaries are defined.
- [x] NTFS-on-macOS behavior is modeled accurately.
- [x] Android ADB responsibilities are explicit.
- [x] Parser-first AI flow is defined.
- [x] SQLite core tables are specified.
- [x] Packaging direction is defined.

## Next Phase

PHASE 3 - Folder Structure and Shared Types
