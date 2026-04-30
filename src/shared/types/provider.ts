import type { ByteSize, DesktopPlatform, ISODateTime } from "./platform";

export type StorageProviderKind =
  | "desktop-filesystem"
  | "android-adb"
  | "android-mtp"
  | "cloud";

export type FilesystemType =
  | "ntfs"
  | "exfat"
  | "fat32"
  | "apfs"
  | "hfs-plus"
  | "unknown"
  | "unsupported";

export type DeviceAccessState =
  | "available"
  | "read-only"
  | "unauthorized"
  | "unavailable"
  | "error";

export type ProviderId = string;

export type StoragePath = string;

export type ProviderWarningCode =
  | "ntfs-read-only-macos"
  | "android-unauthorized"
  | "adb-missing"
  | "device-offline"
  | "write-test-failed"
  | "filesystem-unsupported"
  | "provider-error";

export interface ProviderCapabilities {
  canBrowse: boolean;
  canRead: boolean;
  canWrite: boolean;
  canRename: boolean;
  canDelete: boolean;
  canCreateFolder: boolean;
  canStreamPreview: boolean;
  canHashDirectly: boolean;
  canRunTextExtraction: boolean;
}

export interface ProviderWarning {
  code: ProviderWarningCode;
  message: string;
  helpUrl?: string;
}

export interface StoragePathRef {
  providerId: ProviderId;
  providerKind: StorageProviderKind;
  path: StoragePath;
  displayPath?: string;
}

export interface StorageUsage {
  totalBytes?: ByteSize;
  freeBytes?: ByteSize;
  availableBytes?: ByteSize;
}

export interface BaseProviderDescriptor {
  id: ProviderId;
  kind: StorageProviderKind;
  displayName: string;
  accessState: DeviceAccessState;
  capabilities: ProviderCapabilities;
  warnings: ProviderWarning[];
  platform: DesktopPlatform;
  lastSeenAt: ISODateTime;
}

export interface MountedFilesystemDescriptor extends BaseProviderDescriptor {
  kind: "desktop-filesystem";
  mountPath: string;
  filesystemType: FilesystemType;
  isRemovable: boolean;
  isSystemVolume: boolean;
  usage: StorageUsage;
  writableProbe?: WritableProbeResult;
}

export interface AndroidProviderDescriptor extends BaseProviderDescriptor {
  kind: "android-adb" | "android-mtp";
  serial: string;
  model?: string;
  manufacturer?: string;
  transportState: AndroidTransportState;
  authorizationState: AndroidAuthorizationState;
  roots: AndroidStorageRoot[];
}

export interface AndroidStorageRoot {
  path: StoragePath;
  label: string;
  isPrimary: boolean;
  isWritable?: boolean;
}

export type AndroidTransportState = "device" | "offline" | "unauthorized" | "unknown";

export type AndroidAuthorizationState =
  | "authorized"
  | "unauthorized"
  | "offline"
  | "unknown";

export interface WritableProbeResult {
  checkedAt: ISODateTime;
  writable: boolean;
  method: "access-check" | "temp-write-test" | "provider-reported";
  accessWritable?: boolean;
  errorMessage?: string;
}

export type StorageProviderDescriptor =
  | MountedFilesystemDescriptor
  | AndroidProviderDescriptor;
