import type { FileSystemEngineApi } from "@shared/ipc";

const now = () => new Date().toISOString();

const browserPreviewApi: FileSystemEngineApi = {
  devices: {
    list: async () => ({
      ok: true,
      data: {
        mountedFilesystems: [],
        androidDevices: [],
        allProviders: [],
        refreshedAt: now()
      }
    })
  },
  storage: {
    browse: async (request) => ({
      ok: true,
      data: {
        listing: {
          directory: request.location,
          entries: [],
          providerCapabilities: {
            canBrowse: false,
            canRead: false,
            canWrite: false,
            canRename: false,
            canDelete: false,
            canCreateFolder: false,
            canStreamPreview: false,
            canHashDirectly: false,
            canRunTextExtraction: false
          },
          listedAt: now()
        }
      }
    })
  },
  scans: {
    start: async (request) => ({
      ok: true,
      data: {
        job: {
          id: "browser-preview-scan",
          target: request.target,
          options: request.options,
          status: "queued",
          startedAt: now()
        }
      }
    }),
    get: async (request) => ({
      ok: true,
      data: {
        id: request.scanJobId,
        target: {
          root: {
            providerId: "browser-preview",
            providerKind: "desktop-filesystem",
            path: ""
          }
        },
        options: {
          includeHidden: false,
          recursive: true,
          computeHashes: true,
          parseDocuments: true,
          requestAiSuggestions: false
        },
        status: "failed",
        errorMessage: "Browser preview does not run scan services."
      }
    })
  },
  duplicates: {
    find: async (request) => ({
      ok: true,
      data: {
        groups: [],
        summary: {
          scanJobId: request.scanJobId,
          exactGroups: 0,
          renamedGroups: 0,
          copyVersionGroups: 0,
          nearDuplicateGroups: 0,
          reviewedGroups: 0
        }
      }
    })
  },
  ai: {
    status: async () => ({
      ok: true,
      data: {
        kind: "ollama",
        availability: "missing",
        checkedAt: now(),
        errorMessage: "Browser preview does not connect to Ollama."
      }
    }),
    runTask: async () => ({
      ok: true,
      data: {
        status: "skipped",
        errorMessage: "Browser preview does not run AI tasks."
      }
    })
  },
  operations: {
    executePlan: async (request) => ({
      ok: true,
      data: {
        planId: request.planId,
        status: "failed",
        logs: []
      }
    })
  }
};

export function getFileSystemEngineApi(): FileSystemEngineApi {
  return window.fileSystemEngine ?? browserPreviewApi;
}

