import { lstat, readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { basename, dirname, extname, join, posix } from "node:path";
import type {
  FileEntry,
  FolderSizeSummary,
  RedundantFileCandidate,
  StorageAnalysisRequest,
  StorageAnalysisResult,
  TreemapItem,
  StorageProviderKind
} from "@shared/types";
import { AppError } from "@main/app/AppError";
import { ProviderRegistry } from "@main/providers/providerRegistry";
import { assertPathInsideRoot } from "@main/security/pathValidation";
import type { AndroidProviderDescriptor } from "@shared/types";
import { adbShell, shellQuote } from "@main/providers/AndroidAdbProvider";

const TREEMAP_COLORS = ["#2b6f73", "#7c5b21", "#4f6f52", "#8a4f61", "#4d5f82", "#83613b"];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+\((copy|\d+)\)/g, "")
    .replace(/\b(copy|final|version|v\d+)\b/g, "")
    .replace(/[-_\s]+/g, " ")
    .trim();
}

/**
 * Treemap blocks are the root's immediate child folders, so they never overlap and their
 * widths add up to at most the scanned total. `cumulative` says whether each summary's size
 * already includes its subfolders (desktop walk) or only its own files (adb ls -lR blocks).
 */
function buildTreemapItems(
  summaries: FolderSizeSummary[],
  rootPath: string,
  parentOf: (path: string) => string,
  cumulative: boolean
): TreemapItem[] {
  const children = summaries.filter((folder) => folder.path !== rootPath && parentOf(folder.path) === rootPath);

  return children
    .map((child) => ({
      ...child,
      sizeBytes: cumulative
        ? child.sizeBytes
        : summaries
            .filter((folder) => folder.path === child.path || folder.path.startsWith(`${child.path}/`))
            .reduce((sum, folder) => sum + folder.sizeBytes, 0)
    }))
    .filter((child) => child.sizeBytes > 0)
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, 18)
    .map((folder, index) => ({
      id: folder.path,
      label: folder.name,
      path: folder.path,
      kind: "directory",
      sizeBytes: folder.sizeBytes,
      color: TREEMAP_COLORS[index % TREEMAP_COLORS.length]
    }));
}

function makeFileEntry(providerId: string, providerKind: StorageProviderKind, path: string, name: string, size: number, modifiedAt: Date): FileEntry {
  return {
    ref: {
      providerId,
      providerKind,
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
    const provider = this.registry.get(request.root.providerId);

    if (provider.descriptor.kind === "android-adb") {
      return this.analyzeAdb(request, provider.descriptor);
    }

    if (provider.descriptor.kind !== "desktop-filesystem") {
      throw new AppError("not-implemented", "Storage analysis is currently implemented for desktop and Android filesystems only.");
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
          files.push(makeFileEntry(provider.id, "desktop-filesystem", childPath, dirent.name, stats.size, stats.mtime));
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
    const treemapItems = buildTreemapItems(folderSummaries, rootPath, dirname, true);

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

  private async analyzeAdb(request: StorageAnalysisRequest, descriptor: AndroidProviderDescriptor): Promise<StorageAnalysisResult> {
    if (descriptor.authorizationState !== "authorized") {
      throw new AppError("permission-denied", "Android device not authorized.");
    }

    const rootPath = request.root.path;
    const files: FileEntry[] = [];
    const folderSummaries: FolderSizeSummary[] = [];
    let fileCount = 0;
    let directoryCount = 0;
    let totalBytes = 0;
    const query = request.query?.toLowerCase().trim();

    try {
      // Use adb shell ls -lR for recursive listing
      const stdout = await adbShell(descriptor.serial, `ls -lR -- ${shellQuote(rootPath)}`);
      const blocks = stdout.split('\n\n');
      
      for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length < 2) continue;
        
        let currentDirPath = lines[0].trim();
        if (currentDirPath.endsWith(':')) {
          currentDirPath = currentDirPath.slice(0, -1);
        } else {
          // Sometimes the first block doesn't have the path header if it's the root we requested
          currentDirPath = rootPath;
        }

        let localFileCount = 0;
        let localDirectoryCount = 0;
        let localDirectorySize = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.startsWith('total ')) continue;

          const match = line.match(/^([d\-|l][rwx\-STst]{9})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.*)$/);
          if (match) {
            const [, perms, size, dateStr, name] = match;
            if (!request.includeHidden && name.startsWith('.')) continue;

            const isDir = perms.startsWith('d');
            const sizeBytes = parseInt(size, 10);
            const childPath = currentDirPath === '/' ? `/${name}` : `${currentDirPath}/${name}`;

            if (isDir) {
              directoryCount++;
              localDirectoryCount++;
            } else {
              fileCount++;
              localFileCount++;
              localDirectorySize += sizeBytes;
              totalBytes += sizeBytes;

              if (!query || name.toLowerCase().includes(query) || extname(name).toLowerCase() === query) {
                files.push(makeFileEntry(descriptor.id, "android-adb", childPath, name, sizeBytes, new Date(dateStr)));
              }
            }
          }
        }

        folderSummaries.push({
          path: currentDirPath,
          name: posix.basename(currentDirPath) || currentDirPath,
          sizeBytes: localDirectorySize,
          fileCount: localFileCount,
          directoryCount: localDirectoryCount
        });

        if (fileCount + directoryCount >= request.maxEntries) break;
      }
    } catch (error: any) {
      throw new AppError("filesystem-error", `ADB scan failed: ${error.message}`);
    }

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

    const treemapItems = buildTreemapItems(folderSummaries, rootPath.replace(/\/+$/, "") || "/", posix.dirname, false);

    return {
      root: {
        providerId: descriptor.id,
        providerKind: "android-adb",
        path: rootPath
      },
      scannedAt: new Date().toISOString(),
      totalBytes,
      fileCount,
      directoryCount,
      truncated: fileCount + directoryCount >= request.maxEntries,
      largestFiles,
      smallestFiles,
      largestDirectories,
      extensionBreakdown: Array.from(extensionMap.entries())
        .map(([extension, summary]) => ({ extension, ...summary }))
        .sort((left, right) => right.sizeBytes - left.sizeBytes)
        .slice(0, 20),
      redundantCandidates: this.findRedundantCandidates(files),
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
