# 🛸 File System Engine

A high-performance, secure, and intelligent desktop application for local file management, storage analysis, and multi-device organization. Built with **Electron**, **React 19**, and **Material UI**.

![App Version](https://img.shields.io/badge/version-0.1.0-blue)
![Build Status](https://img.shields.io/badge/build-passing-success)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## 🌟 Key Features

### 📂 Pro File Browser
- **Dual-Pane Operations**: Side-by-side file browsing for seamless copy/move workflows.
- **Smart Breadcrumbs**: Interactive path navigation with instant traversal.
- **Quick-Access Sidebar**: Rapid switching between Home, Downloads, Documents, and mounted drives.

### 🛡️ Secure Architecture
- **Context Isolation**: Hardened preload API prevents renderer access to Node.js internals.
- **Strict CSP**: Content Security Policy allows MUI dynamic styling while blocking external script execution.
- **Permission Awareness**: Built-in guidance for macOS Full Disk Access and Windows Elevation.

### 🤖 Intelligent Foundations (Phase 5/6)
- **Typed IPC**: Fully type-safe communication between Main and Renderer processes.
- **Activity Records**: Persistent logging of file operations via SQLite.
- **Agentic Infrastructure**: Integrated "Agent Pack" roles for automated maintenance and feature expansion.

## 🧠 Agent & Skill Architecture

This project uses an **Agentic Development** approach, where specialized agents manage distinct domains. We use **Skills** (found in `/skills`) to maintain code quality and stability.

| Skill | Purpose |
| :--- | :--- |
| **UI Rendering Safety** | Prevents React crashes and "blank screens" during state transitions. |
| **Window Lifecycle** | Manages Electron window references to prevent memory errors. |
| **Production Styling & CSP** | Ensures MUI and Security Policies coexist perfectly. |

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 20.19.0)
- npm

### Development
```bash
# Install dependencies
npm install

# Start development server (with HMR)
npm run dev
```

### Production Build
```bash
# Build and package for the current OS
npm run build
npm run start
```

## 🗺️ Project Status
- [x] **Phase 1-4**: Core Infrastructure & React Shell
- [x] **Phase 5-6**: IPC Contracts & Desktop Filesystem Integration
- [ ] **Phase 7-8**: Storage Analysis Engine (Next)
- [ ] **Phase 9**: Duplicate File Detection
- [ ] **Phase 10**: AI Engine Integration

---
Developed with ❤️ by the File System Engine Team.
