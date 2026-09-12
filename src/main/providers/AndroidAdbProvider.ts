import { execFile } from "child_process";
import { promisify } from "util";
import { posix } from "path";
import type { StorageProvider } from "./StorageProvider";
import type { BrowseRequest, BrowseResult, FileEntry, AndroidProviderDescriptor } from "@shared/types";
import { getAdbPath } from "../devices/adbPath";

const execFileAsync = promisify(execFile);

/**
 * Quotes one argument for the device-side shell that `adb shell` runs.
 * Single quotes stop $(...), backticks and $VAR from expanding on the phone.
 */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Runs a command on the device through execFile, so the host shell is never involved. */
export async function adbShell(serial: string, command: string): Promise<string> {
  const adbPath = await getAdbPath();
  const { stdout } = await execFileAsync(adbPath, ["-s", serial, "shell", command], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

export class AndroidAdbProvider implements StorageProvider {
  constructor(public readonly descriptor: AndroidProviderDescriptor) { }

  get id(): string {
    return this.descriptor.id;
  }

  get kind(): "android-adb" {
    return "android-adb";
  }

  async browse(request: BrowseRequest): Promise<BrowseResult> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device is not authorized. Please check the screen of the device and allow USB debugging.");
    }

    const directoryPath = request.location.path;
    try {
      // Add trailing slash to force listing contents if it's a symlink (like /sdcard)
      const normalizedPath = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
      
      console.log(`Android Provider: Browsing "${normalizedPath}" on device ${this.descriptor.serial}`);
      
      const stdout = await adbShell(this.descriptor.serial, `ls -la -- ${shellQuote(normalizedPath)}`);
      
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`Android Provider: Received ${lines.length} lines of output.`);

      const entries: FileEntry[] = [];

      for (const line of lines) {
        if (line.startsWith('total ') || line.includes('No such file or directory')) continue;
        if (line.endsWith(' .') || line.endsWith(' ..')) continue;

        const match = line.match(/^([d\-|l][rwx\-STst]{9})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.*)$/);

        if (match) {
          const [, perms, size, dateStr, name] = match;
          if (!request.includeHidden && name.startsWith('.')) continue;

          const sizeBytes = parseInt(size, 10);

          const isSymlink = perms.startsWith('l');
          let actualName = name;
          if (isSymlink && name.includes(' -> ')) {
            actualName = name.split(' -> ')[0];
          }

          if (actualName.startsWith('/')) {
            actualName = actualName.substring(actualName.lastIndexOf('/') + 1);
          }

          if (!actualName || (actualName === 'sdcard' && directoryPath === '/sdcard')) continue;
          
          const isDirEntry = perms.startsWith('d') || (perms.startsWith('l') && !actualName.includes('.'));
          
          const normalizedDir = directoryPath.endsWith('/') && directoryPath !== '/' ? directoryPath.slice(0, -1) : directoryPath;
          const fullPath = normalizedDir === '/' ? `/${actualName}` : `${normalizedDir}/${actualName}`;
          
          entries.push({
            name: actualName,
            kind: isDirEntry ? 'directory' : 'file',
            ref: {
              providerId: this.id,
              providerKind: this.kind,
              path: fullPath
            },
            metadata: {
              sizeBytes: isDirEntry ? undefined : sizeBytes,
              modifiedAt: new Date(dateStr).toISOString(),
              isHidden: actualName.startsWith('.'),
              isReadOnly: false
            },
            capabilities: {
              canRead: true,
              canWrite: true
            }
          });
        }
      }
      console.log(`Android Provider: Successfully parsed ${entries.length} entries.`);

      return {
        listing: {
          directory: request.location,
          entries: entries.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
          }),
          providerCapabilities: {
            canBrowse: true,
            canRead: true,
            canWrite: true,
            canRename: true,
            canDelete: true,
            canCreateFolder: true,
            canStreamPreview: false,
            canHashDirectly: false,
            canRunTextExtraction: false
          },
          listedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error(`Android Provider: Failed to browse ${directoryPath}:`, error);
      throw new Error(error.message || "Failed to browse Android device directory.");
    }
  }

  async pull(androidPath: string, localPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for pull.");
    }
    try {
      const adbPath = await getAdbPath();
      await execFileAsync(adbPath, ["-s", this.descriptor.serial, "pull", androidPath, localPath]);
    } catch (error: any) {
      throw new Error(`ADB pull failed: ${error.message}`);
    }
  }

  async push(localPath: string, androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for push.");
    }
    try {
      const adbPath = await getAdbPath();
      await execFileAsync(adbPath, ["-s", this.descriptor.serial, "push", localPath, androidPath]);
    } catch (error: any) {
      throw new Error(`ADB push failed: ${error.message}`);
    }
  }

  async delete(androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for delete.");
    }
    try {
      await adbShell(this.descriptor.serial, `rm -rf -- ${shellQuote(androidPath)}`);
    } catch (error: any) {
      throw new Error(`ADB delete failed: ${error.message}`);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for rename.");
    }
    try {
      await adbShell(this.descriptor.serial, `mv -n -- ${shellQuote(oldPath)} ${shellQuote(newPath)}`);
    } catch (error: any) {
      throw new Error(`ADB rename failed: ${error.message}`);
    }
  }

  async copyWithin(sourcePath: string, destinationPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for copy.");
    }
    try {
      await adbShell(this.descriptor.serial, `cp -r -- ${shellQuote(sourcePath)} ${shellQuote(destinationPath)}`);
    } catch (error: any) {
      throw new Error(`ADB copy failed: ${error.message}`);
    }
  }

  async createFile(androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for file creation.");
    }
    try {
      await adbShell(this.descriptor.serial, `touch -- ${shellQuote(androidPath)}`);
    } catch (error: any) {
      throw new Error(`ADB touch failed: ${error.message}`);
    }
  }

  async makeDirectory(androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for directory creation.");
    }
    try {
      await adbShell(this.descriptor.serial, `mkdir -p -- ${shellQuote(androidPath)}`);
    } catch (error: any) {
      throw new Error(`ADB mkdir failed: ${error.message}`);
    }
  }
}
