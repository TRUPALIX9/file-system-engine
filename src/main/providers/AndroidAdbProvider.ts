import { exec } from "child_process";
import { promisify } from "util";
import { posix } from "path";
import type { StorageProvider } from "./StorageProvider";
import type { BrowseRequest, BrowseResult, FileEntry, AndroidProviderDescriptor } from "@shared/types";

const execAsync = promisify(exec);

export class AndroidAdbProvider implements StorageProvider {
  constructor(public readonly descriptor: AndroidProviderDescriptor) {}

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

    const path = request.location.path;
    try {
      // Use adb shell ls -la to get directory listing
      const { stdout } = await execAsync(`adb -s ${this.descriptor.serial} shell "ls -la \\"${path}\\""`);
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      
      const entries: FileEntry[] = [];
      
      for (const line of lines) {
        // Skip total block lines or errors
        if (line.startsWith('total ') || line.includes('No such file or directory')) continue;
        if (line.endsWith(' .') || line.endsWith(' ..')) continue;
        
        const match = line.match(/^([d\-|l][rwx\-STst]{9})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.*)$/);
        
        if (match) {
          const [, perms, size, dateStr, name] = match;
          
          if (!request.includeHidden && name.startsWith('.')) continue;
          
          const isDir = perms.startsWith('d');
          const isSymlink = perms.startsWith('l');
          const sizeBytes = parseInt(size, 10);
          
          let actualName = name;
          if (isSymlink && name.includes(' -> ')) {
            actualName = name.split(' -> ')[0];
          }

          const fullPath = path === '/' ? `/${actualName}` : `${path}/${actualName}`;
          
          entries.push({
            name: actualName,
            kind: isDir ? 'directory' : 'file',
            ref: {
              providerId: this.id,
              providerKind: this.kind,
              path: fullPath
            },
            metadata: {
              sizeBytes: isDir ? undefined : sizeBytes,
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
      throw new Error(error.message || "Failed to browse Android device directory.");
    }
  }

  async pull(androidPath: string, localPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for pull.");
    }
    try {
      await execAsync(`adb -s ${this.descriptor.serial} pull "${androidPath}" "${localPath}"`);
    } catch (error: any) {
      throw new Error(`ADB pull failed: ${error.message}`);
    }
  }

  async push(localPath: string, androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for push.");
    }
    try {
      await execAsync(`adb -s ${this.descriptor.serial} push "${localPath}" "${androidPath}"`);
    } catch (error: any) {
      throw new Error(`ADB push failed: ${error.message}`);
    }
  }

  async delete(androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for delete.");
    }
    try {
      await execAsync(`adb -s ${this.descriptor.serial} shell "rm -rf \\"${androidPath}\\""`);
    } catch (error: any) {
      throw new Error(`ADB delete failed: ${error.message}`);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for rename.");
    }
    try {
      await execAsync(`adb -s ${this.descriptor.serial} shell "mv \\"${oldPath}\\" \\"${newPath}\\""`);
    } catch (error: any) {
      throw new Error(`ADB rename failed: ${error.message}`);
    }
  }

  async makeDirectory(androidPath: string): Promise<void> {
    if (this.descriptor.authorizationState !== "authorized") {
      throw new Error("Device not authorized for directory creation.");
    }
    try {
      await execAsync(`adb -s ${this.descriptor.serial} shell "mkdir -p \\"${androidPath}\\""`);
    } catch (error: any) {
      throw new Error(`ADB mkdir failed: ${error.message}`);
    }
  }
}
