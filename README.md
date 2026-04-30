# File System Engine

File System Engine is a production-minded desktop product concept for macOS and Windows. It combines smart file management, external drive management, Android file access, duplicate cleanup, document understanding, and local-first AI suggestions.

The product deliberately treats Android phones as a separate device class instead of assuming they behave like mounted drives. Mounted filesystems use desktop filesystem APIs. Android devices use a provider transport layer, with ADB as the primary cross-platform path.

## Current Phase

- Phase 1: Product Definition - complete
- Phase 2: Technical Architecture - complete
- Phase 3: Folder Structure and Shared Types - complete
- Phase 4: Electron App Shell - complete
- Next: Phase 5 - Preload and IPC Contracts

## Key Rules

- Use File System Engine consistently as the product name.
- Keep mounted filesystem providers separate from Android providers.
- Use ADB as the primary Android implementation path.
- Never claim File System Engine can enable NTFS write support on macOS by itself.
- Disable write actions when a target is read-only.
- Use a parser-first pipeline before AI analysis.
- Support no-AI mode gracefully.

## Project Documents

- [Phase 1 - Product Definition](docs/phases/phase-01-product-definition.md)
- [Phase 2 - Technical Architecture](docs/phases/phase-02-technical-architecture.md)
- [Phase 3 - Folder Structure and Shared Types](docs/phases/phase-03-folder-structure-shared-types.md)
- [Phase 4 - Electron App Shell](docs/phases/phase-04-electron-app-shell.md)
- [Agent Markdown Pack](agents/)

## Development

Install dependencies:

```sh
npm install
```

Run checks:

```sh
npm run typecheck
npm run typecheck:node
npm run typecheck:web
npm run build
```

Run the Electron shell:

```sh
npm run dev
```

GitHub CI runs `npm ci`, `npm run build`, and `npm audit --audit-level=high`.
