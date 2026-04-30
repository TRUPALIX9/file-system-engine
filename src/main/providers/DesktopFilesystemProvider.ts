import { constants } from "node:fs";
import { access, lstat, readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type {
  BrowseRequest,
  BrowseResult,
  FileEntry,
  FileEntryKind,
  MountedFilesystemDescriptor,
  ProviderCapabilities
} from "@shared/types";
import { AppError } from "@main/app/AppError";
import { assertPathInsideRoot } from "@main/security/pathValidation";
import { readMacOsTags } from "@main/storage/macTags";
import type { StorageProvider } from "./StorageProvider";

function kindForDirent(dirent: { isDirectory: () => boolean; isFile: () => boolean; isSymbolicLink: () => boolean }): FileEntryKind {
  if (dirent.isDirectory()) {
    return "directory";
  }

  if (dirent.isFile()) {
    return "file";
  }

  if (dirent.isSymbolicLink()) {
    return "symlink";
  }

  return "other";
}

async function canWrite(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function capabilitiesForEntry(
  providerCapabilities: ProviderCapabilities,
  kind: FileEntryKind,
  writable: boolean
): Partial<ProviderCapabilities> {
  const canBrowse = kind === "directory" && providerCapabilities.canBrowse;
  const canRunTextExtraction = kind === "file" && providerCapabilities.canRunTextExtraction;

  return {
    canBrowse,
    canRead: providerCapabilities.canRead,
    canWrite: providerCapabilities.canWrite && writable,
    canRename: providerCapabilities.canRename && writable,
    canDelete: providerCapabilities.canDelete && writable,
    canCreateFolder: canBrowse && providerCapabilities.canCreateFolder && writable,
    canStreamPreview: providerCapabilities.canStreamPreview,
    canHashDirectly: kind === "file" && providerCapabilities.canHashDirectly,
    canRunTextExtraction
  };
}

function sortEntries(left: FileEntry, right: FileEntry): number {
  if (left.kind === "directory" && right.kind !== "directory") {
    return -1;
  }

  if (left.kind !== "directory" && right.kind === "directory") {
    return 1;
  }

  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

export class DesktopFilesystemProvider implements StorageProvider {
  readonly id: string;
  readonly kind = "desktop-filesystem";
  readonly descriptor: MountedFilesystemDescriptor;

  constructor(descriptor: MountedFilesystemDescriptor) {
    this.id = descriptor.id;
    this.descriptor = descriptor;
  }

  async browse(request: BrowseRequest): Promise<BrowseResult> {
    if (request.location.providerId !== this.id) {
      throw new AppError("provider-not-found");
    }

    if (request.location.providerKind !== "desktop-filesystem") {
      throw new AppError("invalid-request", "Provider kind does not match desktop filesystem.");
    }

    const directoryPath = assertPathInsideRoot(this.descriptor.mountPath, request.location.path);
    const dirents = await readdir(directoryPath, { withFileTypes: true });
    const entries = await Promise.all(
      dirents
        .filter((dirent) => request.includeHidden || !dirent.name.startsWith("."))
        .map(async (dirent): Promise<FileEntry> => {
          const absolutePath = join(directoryPath, dirent.name);
          const [stats, writable, tags] = await Promise.all([
            lstat(absolutePath),
            canWrite(absolutePath),
            readMacOsTags(absolutePath)
          ]);
          const kind = kindForDirent(dirent);

          return {
            ref: {
              providerId: this.id,
              providerKind: "desktop-filesystem",
              path: absolutePath
            },
            name: dirent.name || basename(absolutePath),
            kind,
            metadata: {
              createdAt: stats.birthtime.toISOString(),
              modifiedAt: stats.mtime.toISOString(),
              accessedAt: stats.atime.toISOString(),
              sizeBytes: stats.isFile() ? stats.size : undefined,
              extension: stats.isFile() ? extname(dirent.name).toLowerCase() : undefined,
              tags,
              isHidden: dirent.name.startsWith("."),
              isReadOnly: !writable
            },
            capabilities: capabilitiesForEntry(this.descriptor.capabilities, kind, writable)
          };
        })
    );

    return {
      listing: {
        directory: {
          providerId: this.id,
          providerKind: "desktop-filesystem",
          path: directoryPath
        },
        entries: entries.sort(sortEntries),
        providerCapabilities: this.descriptor.capabilities,
        listedAt: new Date().toISOString()
      }
    };
  }
}
