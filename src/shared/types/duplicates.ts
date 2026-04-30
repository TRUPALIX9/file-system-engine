import type { FileEntry } from "./file";
import type { ISODateTime } from "./platform";

export type DuplicateType =
  | "exact"
  | "renamed"
  | "copy-version"
  | "near-duplicate";

export type DuplicateSignal =
  | "content-hash"
  | "file-size"
  | "normalized-name"
  | "version-pattern"
  | "extracted-text"
  | "embedding"
  | "ai-semantic";

export type DuplicateRecommendation =
  | "keep-newest"
  | "keep-largest"
  | "review-manually"
  | "move-to-review-folder"
  | "delete-confirmed-copies";

export interface DuplicateGroupItem {
  file: FileEntry;
  role: "primary-candidate" | "duplicate-candidate" | "version-candidate";
  score: number;
  signals: DuplicateSignal[];
}

export interface DuplicateGroup {
  id: string;
  scanJobId: string;
  duplicateType: DuplicateType;
  confidence: number;
  reason: string;
  recommendedAction: DuplicateRecommendation;
  items: DuplicateGroupItem[];
  createdAt: ISODateTime;
}

export interface DuplicateScanSummary {
  scanJobId: string;
  exactGroups: number;
  renamedGroups: number;
  copyVersionGroups: number;
  nearDuplicateGroups: number;
  reviewedGroups: number;
}

export interface FindDuplicatesRequest {
  scanJobId: string;
  includeNearDuplicates: boolean;
}

export interface FindDuplicatesResult {
  groups: DuplicateGroup[];
  summary: DuplicateScanSummary;
}

