import type { FileSystemEngineApi } from "@shared/ipc";

const now = () => new Date().toISOString();

const browserPreviewApi: FileSystemEngineApi = {
  platform: "browser",
  devices: {
    list: async () => ({
      ok: true,
      data: {
        mountedFilesystems: [],
        knownFolders: [],
        androidDevices: [],
        allProviders: [],
        refreshedAt: now()
      }
    }),
    onUpdated: () => {
      return () => {};
    }
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
    }),
    analyze: async (request) => ({
      ok: true,
      data: {
        root: request.root,
        scannedAt: now(),
        totalBytes: 0,
        fileCount: 0,
        directoryCount: 0,
        truncated: false,
        largestFiles: [],
        smallestFiles: [],
        largestDirectories: [],
        extensionBreakdown: [],
        redundantCandidates: [],
        treemapItems: []
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
  app: {
    openExternal: async () => ({
      ok: true,
      data: {
        opened: true
      }
    }),
    showOpenDialog: async () => ({
      ok: true,
      data: {
        canceled: true,
        filePaths: []
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
  },
  records: {
    get: async () => ({
      ok: true,
      data: {
        records: [],
        totalCount: 0
      }
    })
  }
};

export function getFileSystemEngineApi(): FileSystemEngineApi {
  return window.fileSystemEngine ?? browserPreviewApi;
}
