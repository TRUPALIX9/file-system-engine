import type { FileEntry } from "./file";
import type { ByteSize, ISODateTime } from "./platform";
import type { StoragePathRef } from "./provider";

export interface StorageAnalysisRequest {
  root: StoragePathRef;
  includeHidden: boolean;
  maxEntries: number;
  maxDepth: number;
  query?: string;
}

export interface FolderSizeSummary {
  path: string;
  name: string;
  sizeBytes: ByteSize;
  fileCount: number;
  directoryCount: number;
}

export interface ExtensionSizeSummary {
  extension: string;
  sizeBytes: ByteSize;
  fileCount: number;
}

export interface RedundantFileCandidate {
  reason: "same-name-and-size" | "copy-version-pattern";
  confidence: number;
  files: FileEntry[];
}

export interface TreemapItem {
  id: string;
  label: string;
  path: string;
  kind: "file" | "directory";
  sizeBytes: ByteSize;
  color: string;
}

export interface StorageAnalysisResult {
  root: StoragePathRef;
  scannedAt: ISODateTime;
  totalBytes: ByteSize;
  fileCount: number;
  directoryCount: number;
  truncated: boolean;
  largestFiles: FileEntry[];
  smallestFiles: FileEntry[];
  largestDirectories: FolderSizeSummary[];
  extensionBreakdown: ExtensionSizeSummary[];
  redundantCandidates: RedundantFileCandidate[];
  treemapItems: TreemapItem[];
}
