import type { ByteSize, ISODateTime } from "./platform";
import type { ProviderCapabilities, StoragePathRef } from "./provider";

export type FileEntryKind = "file" | "directory" | "symlink" | "other";

export type HashAlgorithm = "sha256";

export interface FileHash {
  algorithm: HashAlgorithm;
  value: string;
  computedAt: ISODateTime;
}

export interface FileMetadata {
  createdAt?: ISODateTime;
  modifiedAt?: ISODateTime;
  accessedAt?: ISODateTime;
  sizeBytes?: ByteSize;
  mimeType?: string;
  extension?: string;
  tags?: string[];
  isHidden: boolean;
  isReadOnly: boolean;
}

export interface FileEntry {
  id?: string;
  ref: StoragePathRef;
  name: string;
  kind: FileEntryKind;
  metadata: FileMetadata;
  capabilities: Partial<ProviderCapabilities>;
  contentHash?: FileHash;
}

export interface DirectoryListing {
  directory: StoragePathRef;
  entries: FileEntry[];
  providerCapabilities: ProviderCapabilities;
  listedAt: ISODateTime;
  nextPageToken?: string;
}

export interface BrowseRequest {
  location: StoragePathRef;
  pageToken?: string;
  includeHidden?: boolean;
}

export interface BrowseResult {
  listing: DirectoryListing;
}
