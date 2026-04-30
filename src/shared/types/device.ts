import type {
  AndroidProviderDescriptor,
  DeviceAccessState,
  FilesystemType,
  MountedFilesystemDescriptor,
  ProviderCapabilities,
  ProviderId,
  ProviderWarning,
  StorageProviderDescriptor,
  StorageProviderKind
} from "./provider";
import type { DesktopPlatform, ISODateTime } from "./platform";

export type DeviceClass = "mounted-filesystem" | "android-device";

export interface DeviceSummary {
  id: ProviderId;
  class: DeviceClass;
  providerKind: StorageProviderKind;
  displayName: string;
  accessState: DeviceAccessState;
  capabilities: ProviderCapabilities;
  warnings: ProviderWarning[];
  platform: DesktopPlatform;
  lastSeenAt: ISODateTime;
}

export interface MountedDeviceSummary extends DeviceSummary {
  class: "mounted-filesystem";
  providerKind: "desktop-filesystem";
  mountPath: string;
  filesystemType: FilesystemType;
  isRemovable: boolean;
}

export interface AndroidDeviceSummary extends DeviceSummary {
  class: "android-device";
  providerKind: "android-adb" | "android-mtp";
  serial: string;
  model?: string;
  authorizationState: AndroidProviderDescriptor["authorizationState"];
}

export type StorageDeviceSummary = MountedDeviceSummary | AndroidDeviceSummary;

export interface DeviceInventory {
  mountedFilesystems: MountedFilesystemDescriptor[];
  knownFolders: MountedFilesystemDescriptor[];
  androidDevices: AndroidProviderDescriptor[];
  allProviders: StorageProviderDescriptor[];
  refreshedAt: ISODateTime;
}
