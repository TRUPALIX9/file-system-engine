# PHASE 1 - Product Definition

## Active Agent

Product Architect

## Objective

Define File System Engine as a cross-platform smart file manager for macOS and Windows that understands local files, external drives, Android phones, document content, duplicate relationships, and NTFS-on-macOS limitations. The product definition establishes MVP scope, user flows, acceptance criteria, and non-negotiable platform truths before implementation begins.

## Files Created or Changed

- `README.md`
- `agents/01-product-architect.md`
- `docs/phases/phase-01-product-definition.md`

## Full Deliverable

### Product Summary

File System Engine is an AI-powered file intelligence and storage management desktop application. It is designed for users who need more than a traditional file explorer: they need to understand what files are, where they belong, which ones are duplicates, what can be safely cleaned up, and which devices or drives are writable.

File System Engine manages two distinct storage models:

1. Mounted filesystem devices

   Local disks, external SSDs, USB drives, SD cards, and other mounted volumes expose normal desktop paths and are accessed through filesystem APIs.

2. Connected Android devices

   Android phones and tablets are treated as device-backed storage targets, not as mounted drives. The MVP uses ADB through an Android provider layer for detection, browsing, pull, push, rename, delete, and metadata operations where supported.

File System Engine is local-first. It should remain useful when AI is unavailable, and it should use parser-first document processing before sending extracted content to local AI services.

### Product Positioning

File System Engine is positioned as:

- a smarter replacement for manual file cleanup
- a safer assistant for external drive and USB storage management
- a local-first document intelligence tool
- a duplicate cleanup review system
- a cross-platform Android file manager using ADB as the portable base
- a clear NTFS-on-macOS guidance surface that never overpromises write support

### User Personas

#### Persona 1: Overloaded Desktop User

This user has messy Downloads, Documents, Desktop, and cloud-sync folders. They want suggestions for organization, duplicate cleanup, and safer bulk file actions without needing to manually inspect every file.

Primary needs:
- scan a folder
- identify documents by meaning
- group files into suggested categories
- review suggested renames and moves
- clean duplicate clutter safely

#### Persona 2: External Drive Power User

This user works with USB drives, SSDs, backup disks, camera cards, and portable storage. They need to know whether a drive is writable, what filesystem it uses, and whether file actions are safe.

Primary needs:
- detect connected drives
- see filesystem type and writable state
- browse external storage
- copy, move, rename, and delete files when allowed
- understand why a drive is read-only

#### Persona 3: Mac User With NTFS Drives

This user plugs a Windows-formatted NTFS drive into a Mac and cannot write to it. File System Engine should not pretend to fix this directly. It should explain the limitation and guide the user toward a compatible NTFS driver or a reformatting strategy.

Primary needs:
- see that NTFS is read-only on macOS
- avoid failed write operations
- open a trusted driver vendor page
- refresh access after installing a driver
- understand exFAT as a cross-platform option when reformatting is acceptable

#### Persona 4: Android Phone Owner

This user connects an Android phone by USB and wants to move media or documents between the phone and computer. File System Engine should support this through ADB, with clear unauthorized-device handling.

Primary needs:
- detect connected Android devices
- see authorization state
- browse accessible folders
- pull files to desktop
- push files to Android
- rename or delete where provider capabilities allow

#### Persona 5: Privacy-Conscious Knowledge Worker

This user wants summaries, categories, and suggested filenames without uploading documents to a cloud AI service.

Primary needs:
- use local AI through Ollama
- understand when AI is unavailable
- continue using core file manager features without AI
- keep extracted text and metadata local

### Core Use Cases

#### Use Case 1: Organize a Messy Folder

1. User chooses a local folder such as Downloads.
2. File System Engine scans files and records metadata.
3. Supported documents are parsed with file-type-specific extractors.
4. AI produces categories, summaries, suggested folders, suggested filenames, and explanations when Ollama is available.
5. File System Engine shows a review queue of proposed actions.
6. User confirms selected moves and renames.
7. File System Engine executes actions with logging and safety checks.

#### Use Case 2: Clean Duplicates

1. User selects a folder or drive.
2. File System Engine hashes files and compares size, names, and patterns.
3. Exact duplicates and renamed duplicates are grouped by content hash.
4. Likely copy/version duplicates are grouped by normalized filename and version patterns.
5. Near duplicates are scored later through extracted text and embeddings.
6. User reviews grouping reasons and chooses actions.
7. File System Engine executes only confirmed actions.

#### Use Case 3: Manage External Drive

1. User connects an external drive.
2. File System Engine detects mount path, filesystem type, total space, free space, removable state, and writable state.
3. File System Engine assigns capabilities based on actual access, not only filesystem label.
4. File operations are enabled only when supported.
5. If macOS detects NTFS and writable=false, File System Engine displays the driver-assist flow.

#### Use Case 4: Manage Android Phone

1. User connects Android device by USB.
2. File System Engine detects the device through the Android provider.
3. If unauthorized, File System Engine shows the USB debugging authorization message.
4. If authorized, File System Engine lists accessible roots or common paths.
5. User browses, pulls, pushes, renames, or deletes files where supported.
6. File System Engine can scan accessible Android files for duplicate or organization suggestions through provider-safe reads.

### MVP Scope

The MVP includes:

- Electron desktop shell for macOS and Windows
- React, TypeScript, and Vite frontend
- secure preload bridge and typed IPC
- local folder browsing
- external drive browsing
- drive filesystem detection
- actual writable/read-only detection
- NTFS-on-macOS driver-assist UI
- desktop file operations: copy, move, rename, delete, create folder
- explicit confirmation for destructive actions
- Android device support through ADB provider
- Android unauthorized-device handling
- Android browse, pull, push, rename, and delete where supported
- PDF, DOCX, TXT, CSV, and XLSX metadata/text extraction
- duplicate detection by size, content hash, and filename/version patterns
- local AI provider abstraction with Ollama
- AI category and folder suggestions when available
- no-AI mode for core file management
- SQLite metadata store for scans, files, devices, duplicate groups, and AI suggestions
- review-before-execute workflow

### Later Scope

Later phases may add:

- Android MTP adapter
- Windows Phone Link or File Explorer integration adapter
- embedding-based semantic duplicate detection
- image OCR
- background folder watchers
- cloud providers
- rules engine
- scheduled cleanup jobs
- richer undo and trash integration
- drag-and-drop organization flows

### Non-Goals for MVP

The MVP will not:

- silently install NTFS drivers
- claim to enable NTFS write support on macOS by itself
- require Windows-only Android integrations for core Android support
- rely on Android mounting as a normal desktop drive
- send document content to remote AI services by default
- execute arbitrary shell commands from renderer-provided input
- perform destructive bulk cleanup without review

### Edge Cases

- Android device is connected but unauthorized.
- Android device disconnects during browse, pull, push, rename, or delete.
- `adb` is missing, inaccessible, or returns unexpected output.
- Multiple Android devices are connected.
- External drive is unplugged during scan or operation.
- Drive reports NTFS but is writable because a user-installed driver is active.
- Drive reports writable permissions but write test fails.
- macOS NTFS drive is read-only.
- Files disappear or change during scanning.
- Symbolic links, junctions, aliases, and recursive paths could create loops.
- Duplicate candidate files have identical names but different content.
- Duplicate candidate files have identical hashes but different locations.
- Large files should not be loaded fully into memory.
- AI runtime is unavailable, model is missing, or request times out.
- Parser fails on corrupt PDF, DOCX, CSV, or XLSX files.
- User attempts write operations on read-only targets.
- File names contain unsupported characters for the destination device/provider.
- Cross-provider moves require copy plus verified delete, not a normal filesystem rename.

### Acceptance Criteria

File System Engine product definition is accepted when:

- Mounted filesystems and Android devices are defined as distinct models.
- ADB is the primary Android technical path.
- Optional Windows Android integration is clearly secondary and adapter-based.
- NTFS-on-macOS behavior is stated without false write-support claims.
- MVP includes local folders, external drives, Android ADB, parsing, duplicate detection, local AI suggestions, and review-before-execute.
- Core flows cover folder organization, duplicate cleanup, external drive management, and Android management.
- Edge cases cover authorization, disconnection, read-only targets, missing AI, missing ADB, and parser failures.
- Product copy includes the required NTFS, Android unauthorized, and duplicate reasoning messages.

## Notes

Required UX copy:

- NTFS on macOS: "This NTFS drive is mounted read-only on macOS. To enable writing, install a compatible NTFS driver on this Mac, then refresh access."
- Android unauthorized: "Android device detected, but access is not authorized yet. Enable USB debugging on the device and authorize this computer."
- Duplicate reasoning: "These files appear to be copies or versions of the same content based on name patterns, size, and content similarity."

Product truth:

- File System Engine can guide users through NTFS driver assist, but cannot silently enable NTFS write support.
- Android support is a provider-backed device workflow, not a normal mounted-drive workflow.
- AI enhances classification and suggestions, but the app remains usable without AI.

## Validation Checklist

- [x] Product name is File System Engine.
- [x] Android is separate from mounted filesystems.
- [x] ADB is the primary Android path.
- [x] NTFS-on-macOS guidance is accurate and conservative.
- [x] MVP scope is bounded and implementable.
- [x] User flows align with the requested product vision.
- [x] Acceptance criteria are explicit.

## Next Phase

PHASE 2 - Technical Architecture
