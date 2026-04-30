import { lstat, readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { basename, extname, join } from "node:path";
import type {
  FileEntry,
  FolderSizeSummary,
  RedundantFileCandidate,
  StorageAnalysisRequest,
  StorageAnalysisResult,
  TreemapItem
} from "@shared/types";
import { AppError } from "@main/app/AppError";
import { ProviderRegistry } from "@main/providers/providerRegistry";
import { assertPathInsideRoot } from "@main/security/pathValidation";

const TREEMAP_COLORS = ["#2b6f73", "#7c5b21", "#4f6f52", "#8a4f61", "#4d5f82", "#83613b"];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+\((copy|\d+)\)/g, "")
    .replace(/\b(copy|final|version|v\d+)\b/g, "")
    .replace(/[-_\s]+/g, " ")
    .trim();
}

function makeFileEntry(providerId: string, path: string, name: string, size: number, modifiedAt: Date): FileEntry {
  return {
    ref: {
      providerId,
      providerKind: "desktop-filesystem",
      path
    },
    name,
    kind: "file",
    metadata: {
      modifiedAt: modifiedAt.toISOString(),
      sizeBytes: size,
      extension: extname(name).toLowerCase(),
      isHidden: name.startsWith("."),
      isReadOnly: false
    },
    capabilities: {
      canRead: true,
      canHashDirectly: true,
      canRunTextExtraction: true
    }
  };
}

export class StorageAnalysisService {
  constructor(private readonly registry: ProviderRegistry) {}

  async analyze(request: StorageAnalysisRequest): Promise<StorageAnalysisResult> {
    if (request.root.providerKind !== "desktop-filesystem") {
      throw new AppError("not-implemented", "Storage analysis is currently implemented for desktop filesystems only.");
    }

    const provider = this.registry.get(request.root.providerId);

    if (provider.descriptor.kind !== "desktop-filesystem") {
      throw new AppError("not-implemented", "Storage analysis is currently implemented for desktop filesystems only.");
    }

    const rootPath = assertPathInsideRoot(provider.descriptor.mountPath, request.root.path);
    const files: FileEntry[] = [];
    const folderSummaries: FolderSizeSummary[] = [];
    let fileCount = 0;
    let directoryCount = 0;
    let truncated = false;
    const query = request.query?.toLowerCase().trim();

    const walk = async (path: string, depth: number): Promise<number> => {
      if (fileCount + directoryCount >= request.maxEntries) {
        truncated = true;
        return 0;
      }

      let dirents: Dirent[];

      try {
        dirents = await readdir(path, { withFileTypes: true });
      } catch {
        return 0;
      }
      let directorySize = 0;
      let localFileCount = 0;
      let localDirectoryCount = 0;

      for (const dirent of dirents) {
        if (!request.includeHidden && dirent.name.startsWith(".")) {
          continue;
        }

        if (fileCount + directoryCount >= request.maxEntries) {
          truncated = true;
          break;
        }

        const childPath = join(path, dirent.name);

        if (dirent.isSymbolicLink()) {
          continue;
        }

        let stats: Awaited<ReturnType<typeof lstat>>;

        try {
          stats = await lstat(childPath);
        } catch {
          continue;
        }

        if (dirent.isDirectory()) {
          directoryCount += 1;
          localDirectoryCount += 1;
          const childSize = depth < request.maxDepth ? await walk(childPath, depth + 1) : 0;
          directorySize += childSize;
          continue;
        }

        if (!dirent.isFile()) {
          continue;
        }

        fileCount += 1;
        localFileCount += 1;
        directorySize += stats.size;

        if (!query || dirent.name.toLowerCase().includes(query) || extname(dirent.name).toLowerCase() === query) {
          files.push(makeFileEntry(provider.id, childPath, dirent.name, stats.size, stats.mtime));
        }
      }

      folderSummaries.push({
        path,
        name: basename(path) || path,
        sizeBytes: directorySize,
        fileCount: localFileCount,
        directoryCount: localDirectoryCount
      });

      return directorySize;
    };

    const totalBytes = await walk(rootPath, 0);
    const largestFiles = [...files].sort((left, right) => (right.metadata.sizeBytes ?? 0) - (left.metadata.sizeBytes ?? 0)).slice(0, 1000);
    const smallestFiles = [...files].sort((left, right) => (left.metadata.sizeBytes ?? 0) - (right.metadata.sizeBytes ?? 0)).slice(0, 1000);
    const largestDirectories = folderSummaries
      .filter((folder) => folder.path !== rootPath)
      .sort((left, right) => right.sizeBytes - left.sizeBytes)
      .slice(0, 100);
    const extensionMap = new Map<string, { fileCount: number; sizeBytes: number }>();

    for (const file of files) {
      const extension = file.metadata.extension || "(none)";
      const current = extensionMap.get(extension) ?? { fileCount: 0, sizeBytes: 0 };
      current.fileCount += 1;
      current.sizeBytes += file.metadata.sizeBytes ?? 0;
      extensionMap.set(extension, current);
    }

    const redundantCandidates = this.findRedundantCandidates(files);
    const treemapItems: TreemapItem[] = largestDirectories.slice(0, 18).map((folder, index) => ({
      id: folder.path,
      label: folder.name,
      path: folder.path,
      kind: "directory",
      sizeBytes: folder.sizeBytes,
      color: TREEMAP_COLORS[index % TREEMAP_COLORS.length]
    }));

    return {
      root: {
        providerId: provider.id,
        providerKind: "desktop-filesystem",
        path: rootPath
      },
      scannedAt: new Date().toISOString(),
      totalBytes,
      fileCount,
      directoryCount,
      truncated,
      largestFiles,
      smallestFiles,
      largestDirectories,
      extensionBreakdown: Array.from(extensionMap.entries())
        .map(([extension, summary]) => ({ extension, ...summary }))
        .sort((left, right) => right.sizeBytes - left.sizeBytes)
        .slice(0, 20),
      redundantCandidates,
      treemapItems
    };
  }

  private findRedundantCandidates(files: FileEntry[]): RedundantFileCandidate[] {
    const groups = new Map<string, FileEntry[]>();

    for (const file of files) {
      const key = `${normalizeName(file.name)}:${file.metadata.sizeBytes ?? 0}`;
      const group = groups.get(key) ?? [];
      group.push(file);
      groups.set(key, group);
    }

    return Array.from(groups.values())
      .filter((group) => group.length > 1)
      .slice(0, 50)
      .map((files) => ({
        reason: "same-name-and-size",
        confidence: 0.72,
        files
      }));
  }
}
