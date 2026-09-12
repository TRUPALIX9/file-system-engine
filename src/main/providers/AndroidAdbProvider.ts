import { execFile } from "child_process";
import { promisify } from "util";
import { posix } from "path";
import { lstat } from "fs/promises";
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

/** Printed by the device when a destination is already taken (stdout, so it works even where adb drops exit codes). */
export const EXISTS_MARKER = "__FSE_DESTINATION_EXISTS__";

/**
 * Wraps a device command so it only runs when `destination` is free. Plain `mv`/`cp -r` onto an
 * existing folder would nest the item inside it, and `mv -n` silently does nothing.
 */
export function unlessExists(destination: string, command: string): string {
  const quoted = shellQuote(destination);
  return `if [ -e ${quoted} ] || [ -L ${quoted} ]; then echo ${EXISTS_MARKER}; else ${command}; fi`;
}

function destinationTaken(path: string, where: string): Error {
  return new Error(`An item named "${posix.basename(path)}" already exists ${where}.`);
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
    // adb pull overwrites a local file (and nests into a local folder), so refuse a taken name.
    const localTaken = await lstat(localPath).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    });
    if (localTaken) {
      throw destinationTaken(localPath, "in the destination folder");
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
    // adb push overwrites a device file (and nests into a device folder), so refuse a taken name.
    const check = await adbShell(this.descriptor.serial, unlessExists(androidPath, "true"));
    if (check.includes(EXISTS_MARKER)) {
      throw destinationTaken(androidPath, "on the device");
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
    let stdout: string;
    try {
      stdout = await adbShell(this.descriptor.serial, unlessExists(newPath, `mv -- ${shellQuote(oldPath)} ${shellQuote(newPath)}`));
    } catch (error: any) {
      throw new Error(`ADB rename failed: ${error.message}`);
    }
    if (stdout.includes(EXISTS_MARKER)) {
      throw destinationTaken(newPath, "on the device");
    }
  }

  async copyWithin(sourcePath: string, destinationPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for copy.");
    }
    let stdout: string;
    try {
      stdout = await adbShell(this.descriptor.serial, unlessExists(destinationPath, `cp -r -- ${shellQuote(sourcePath)} ${shellQuote(destinationPath)}`));
    } catch (error: any) {
      throw new Error(`ADB copy failed: ${error.message}`);
    }
    if (stdout.includes(EXISTS_MARKER)) {
      throw destinationTaken(destinationPath, "on the device");
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
