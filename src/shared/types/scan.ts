import type { DuplicateScanSummary } from "./duplicates";
import type { ISODateTime } from "./platform";
import type { StoragePathRef } from "./provider";

export type ScanStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ScanOptions {
  includeHidden: boolean;
  recursive: boolean;
  computeHashes: boolean;
  parseDocuments: boolean;
  requestAiSuggestions: boolean;
  maxDepth?: number;
}

export interface ScanTarget {
  root: StoragePathRef;
  label?: string;
}

export interface ScanJob {
  id: string;
  target: ScanTarget;
  options: ScanOptions;
  status: ScanStatus;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  errorMessage?: string;
}

export interface ScanResult {
  job: ScanJob;
  fileCount: number;
  directoryCount: number;
  parsedDocumentCount: number;
  duplicateSummary?: DuplicateScanSummary;
}

export interface StartScanRequest {
  target: ScanTarget;
  options: ScanOptions;
}

export interface StartScanResult {
  job: ScanJob;
}

export interface GetScanRequest {
  scanJobId: string;
}
