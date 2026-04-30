import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readdir, statfs } from "node:fs/promises";
import { basename, parse } from "node:path";
import { promisify } from "node:util";
import { PRODUCT_COPY } from "@shared/constants/app";
import type {
  FilesystemType,
  MountedFilesystemDescriptor,
  ProviderCapabilities,
  ProviderWarning,
  StorageUsage,
  WritableProbeResult
} from "@shared/types";
import { getDesktopPlatform } from "./platform";

const execFileAsync = promisify(execFile);

interface MountRecord {
  source: string;
  mountPath: string;
  filesystemType: FilesystemType;
  rawFilesystemType: string;
  isRemovable: boolean;
  isSystemVolume: boolean;
}

const WRITABLE_FALSE_CAPABILITIES: ProviderCapabilities = {
  canBrowse: true,
  canRead: true,
  canWrite: false,
  canRename: false,
  canDelete: false,
  canCreateFolder: false,
  canStreamPreview: true,
  canHashDirectly: true,
  canRunTextExtraction: true
};

const WRITABLE_TRUE_CAPABILITIES: ProviderCapabilities = {
  ...WRITABLE_FALSE_CAPABILITIES,
  canWrite: true,
  canRename: true,
  canDelete: true,
  canCreateFolder: true
};

function mapFilesystemType(rawType: string): FilesystemType {
  const normalized = rawType.trim().toLowerCase();

  if (normalized.includes("ntfs")) {
    return "ntfs";
  }

  if (normalized.includes("exfat")) {
    return "exfat";
  }

  if (
    normalized === "msdos" ||
    normalized.includes("fat32") ||
    normalized.includes("vfat") ||
    normalized.includes("fat")
  ) {
    return "fat32";
  }

  if (normalized.includes("apfs")) {
    return "apfs";
  }

  if (normalized.includes("hfs")) {
    return "hfs-plus";
  }

  if (
    normalized.includes("devfs") ||
    normalized.includes("autofs") ||
    normalized.includes("proc") ||
    normalized.includes("tmpfs")
  ) {
    return "unsupported";
  }

  return "unknown";
}

function providerIdForMountPath(mountPath: string): string {
  return `desktop:${Buffer.from(mountPath).toString("base64url")}`;
}

function displayNameForMount(record: MountRecord): string {
  if (record.mountPath === "/") {
    return "System Volume";
  }

  if (process.platform === "win32") {
    return record.mountPath;
  }

  return basename(record.mountPath) || record.source || record.mountPath;
}

async function canAccessForWrite(path: string): Promise<WritableProbeResult> {
  const checkedAt = new Date().toISOString();

  try {
    await access(path, constants.W_OK);

    return {
      checkedAt,
      writable: true,
      method: "access-check"
    };
  } catch (error) {
    return {
      checkedAt,
      writable: false,
      method: "access-check",
      errorMessage: error instanceof Error ? error.message : undefined
    };
  }
}

async function usageForPath(path: string): Promise<StorageUsage> {
  try {
    const stats = await statfs(path);
    const blockSize = Number(stats.bsize);

    return {
      totalBytes: Number(stats.blocks) * blockSize,
      freeBytes: Number(stats.bfree) * blockSize,
      availableBytes: Number(stats.bavail) * blockSize
    };
  } catch {
    return {};
  }
}

function warningsFor(record: MountRecord, writable: boolean): ProviderWarning[] {
  if (getDesktopPlatform() === "macos" && record.filesystemType === "ntfs" && !writable) {
    return [
      {
        code: "ntfs-read-only-macos",
        message: PRODUCT_COPY.ntfsReadOnly,
        helpUrl: "https://www.paragon-software.com/home/ntfs-mac/"
      }
    ];
  }

  if (record.filesystemType === "unsupported") {
    return [
      {
        code: "filesystem-unsupported",
        message: "This filesystem is detected but not supported for normal file management."
      }
    ];
  }

  return [];
}

async function mountOutput(): Promise<string> {
  const { stdout } = await execFileAsync("mount", []);
  return stdout;
}

function parseUnixMountOutput(output: string): MountRecord[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = /^(.+?) on (.+?) \((.+)\)$/.exec(line);

      if (!match) {
        return [];
      }

      const [, source, mountPath, optionsText] = match;
      const [rawFilesystemType = "unknown"] = optionsText.split(",");
      const filesystemType = mapFilesystemType(rawFilesystemType);
      const isMac = process.platform === "darwin";
      const isLinux = process.platform === "linux";
      const isSystemVolume = mountPath === "/";
      const isMacVolume = isMac && (mountPath === "/" || mountPath.startsWith("/Volumes/"));
      const isLinuxStorage =
        isLinux &&
        (mountPath === "/" ||
          mountPath.startsWith("/mnt/") ||
          mountPath.startsWith("/media/") ||
          mountPath.startsWith("/run/media/"));

      if (!isMacVolume && !isLinuxStorage) {
        return [];
      }

      if (filesystemType === "unsupported") {
        return [];
      }

      return [
        {
          source,
          mountPath,
          rawFilesystemType,
          filesystemType,
          isRemovable: !isSystemVolume,
          isSystemVolume
        }
      ];
    });
}

async function detectWindowsMounts(): Promise<MountRecord[]> {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const records: MountRecord[] = [];

  await Promise.all(
    letters.map(async (letter) => {
      const rootPath = `${letter}:\\`;

      try {
        await readdir(rootPath);
      } catch {
        return;
      }

      records.push({
        source: rootPath,
        mountPath: rootPath,
        rawFilesystemType: "unknown",
        filesystemType: "unknown",
        isRemovable: letter !== parse(process.cwd()).root.charAt(0).toUpperCase(),
        isSystemVolume: letter === parse(process.cwd()).root.charAt(0).toUpperCase()
      });
    })
  );

  return records.sort((left, right) => left.mountPath.localeCompare(right.mountPath));
}

async function detectMountRecords(): Promise<MountRecord[]> {
  if (process.platform === "win32") {
    return detectWindowsMounts();
  }

  const output = await mountOutput();
  return parseUnixMountOutput(output);
}

export async function detectMountedFilesystems(): Promise<MountedFilesystemDescriptor[]> {
  const platform = getDesktopPlatform();
  const records = await detectMountRecords();

  return Promise.all(
    records.map(async (record) => {
      const [usage, writableProbe] = await Promise.all([
        usageForPath(record.mountPath),
        canAccessForWrite(record.mountPath)
      ]);
      const warnings = warningsFor(record, writableProbe.writable);
      const capabilities = writableProbe.writable
        ? WRITABLE_TRUE_CAPABILITIES
        : WRITABLE_FALSE_CAPABILITIES;

      return {
        id: providerIdForMountPath(record.mountPath),
        kind: "desktop-filesystem",
        displayName: displayNameForMount(record),
        accessState: writableProbe.writable ? "available" : "read-only",
        capabilities,
        warnings,
        platform,
        lastSeenAt: new Date().toISOString(),
        mountPath: record.mountPath,
        filesystemType: record.filesystemType,
        isRemovable: record.isRemovable,
        isSystemVolume: record.isSystemVolume,
        usage,
        writableProbe
      } satisfies MountedFilesystemDescriptor;
    })
  );
}
