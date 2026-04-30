# Main Process

The Electron main process owns trusted system access for File System Engine.

Responsibilities:
- application window creation
- IPC handler registration
- mounted filesystem provider orchestration
- Android ADB provider orchestration
- file operation execution
- parsing, duplicate analysis, AI calls, and SQLite access
- validation of every renderer request

The renderer must never call Node.js, filesystem APIs, or ADB directly.

