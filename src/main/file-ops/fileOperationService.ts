import { shell } from "electron";
import { cp, lstat, mkdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, posix } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ExecuteOperationPlanRequest,
  ExecuteOperationPlanResult,
  FileOperation,
  OperationLogEntry,
  StoragePathRef
} from "@shared/types";
import { DesktopFilesystemProvider } from "@main/providers/DesktopFilesystemProvider";
import { AndroidAdbProvider } from "@main/providers/AndroidAdbProvider";
import { AppError } from "@main/app/AppError";
import { ProviderRegistry } from "@main/providers/providerRegistry";
import { assertPathInsideRoot } from "@main/security/pathValidation";
import { setMacOsTags } from "@main/storage/macTags";

function assertDesktopRef(ref: StoragePathRef): void {
  if (ref.providerKind !== "desktop-filesystem") {
    throw new AppError("not-implemented", "File operations are currently implemented for desktop filesystems only.");
  }
}

function assertSafeName(name: string): string {
  if (name.includes("/") || name.includes("\\") || name === "." || name === "..") {
    throw new AppError("invalid-request", "Rename target must be a file or folder name, not a path.");
  }

  return name;
}

/** Throws when something already exists at the destination, so moves and renames never clobber it. */
async function assertDestinationFree(destination: string): Promise<void> {
  try {
    await lstat(destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  throw new AppError("filesystem-error", `An item named "${basename(destination)}" already exists in the destination folder.`);
}

export class FileOperationService {
  constructor(private readonly registry: ProviderRegistry) {}

  private resolveRef(ref: StoragePathRef): string {
    const provider = this.registry.get(ref.providerId);

    if (provider.kind === "desktop-filesystem") {
      if (provider.descriptor.kind !== "desktop-filesystem") {
        throw new AppError("not-implemented");
      }
      return assertPathInsideRoot(provider.descriptor.mountPath, ref.path);
    }

    // For Android or other non-desktop providers, we return the path directly
    // but these cannot be used with standard node:fs methods.
    return ref.path;
  }

  private assertWritable(ref: StoragePathRef): void {
    const provider = this.registry.get(ref.providerId);

    if (provider.descriptor.kind === "desktop-filesystem") {
      if (!provider.descriptor.capabilities.canWrite) {
        throw new AppError("permission-denied", "This provider is read-only.");
      }
    } else if (provider.descriptor.kind === "android-adb") {
      if (provider.descriptor.authorizationState !== "authorized") {
        throw new AppError("permission-denied", "Android device not authorized.");
      }
    }
  }

  private assertOperationAllowed(operation: FileOperation): void {
    switch (operation.kind) {
      case "copy":
      case "create-folder":
      case "create-file":
      case "push-to-android":
        if ("destination" in operation) {
          this.assertWritable(operation.destination);
        }
        return;

      case "move":
        this.assertWritable(operation.source);
        this.assertWritable(operation.destination);
        return;

      case "rename":
      case "delete":
      case "set-tags":
        this.assertWritable(operation.source);
        return;

      case "pull-from-android":
        this.assertWritable(operation.destination);
        return;
    }
  }

  async executePlan(request: ExecuteOperationPlanRequest): Promise<ExecuteOperationPlanResult> {
    if (!request.confirmed && request.operations.some((operation) => operation.requiresConfirmation)) {
      return {
        planId: request.planId,
        status: "awaiting-confirmation",
        logs: []
      };
    }

    const logs: OperationLogEntry[] = [];

    for (const operation of request.operations) {
      const startedAt = new Date().toISOString();

      try {
        this.assertOperationAllowed(operation);
        await this.executeOperation(operation);
        logs.push({
          id: randomUUID(),
          planId: request.planId,
          operationId: operation.id,
          kind: operation.kind,
          status: "completed",
          source: "source" in operation ? operation.source : undefined,
          destination: "destination" in operation ? operation.destination : undefined,
          startedAt,
          completedAt: new Date().toISOString(),
          reversible: operation.kind === "delete"
        });
      } catch (error) {
        logs.push({
          id: randomUUID(),
          planId: request.planId,
          operationId: operation.id,
          kind: operation.kind,
          status: "failed",
          source: "source" in operation ? operation.source : undefined,
          destination: "destination" in operation ? operation.destination : undefined,
          startedAt,
          completedAt: new Date().toISOString(),
          reversible: false,
          errorMessage: error instanceof Error ? error.message : "Operation failed."
        });

        return {
          planId: request.planId,
          status: "failed",
          logs
        };
      }
    }

    return {
      planId: request.planId,
      status: "completed",
      logs
    };
  }

  private async executeOperation(operation: FileOperation): Promise<void> {
    switch (operation.kind) {
      case "copy": {
        const sourceRef = operation.source;
        const destRef = operation.destination;
        const sourceProvider = this.registry.get(sourceRef.providerId);
        const destProvider = this.registry.get(destRef.providerId);

        if (sourceProvider.kind === "android-adb" && destProvider.kind === "android-adb") {
          // Internal Android copy
          if (sourceRef.providerId !== destRef.providerId) {
             throw new AppError("not-implemented", "Copying between different Android devices is not supported yet.");
          }
          await (sourceProvider as AndroidAdbProvider).copyWithin(sourceRef.path, destRef.path);
          return;
        }

        if (sourceProvider.kind === "android-adb") {
          return (sourceProvider as AndroidAdbProvider).pull(sourceRef.path, this.resolveRef(destRef));
        }

        if (destProvider.kind === "android-adb") {
          return (destProvider as AndroidAdbProvider).push(this.resolveRef(sourceRef), destRef.path);
        }

        // Standard desktop copy
        const source = this.resolveRef(sourceRef);
        const destination = this.resolveRef(destRef);
        await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
        return;
      }

      case "move": {
        const sourceRef = operation.source;
        const destRef = operation.destination;
        const sourceProvider = this.registry.get(sourceRef.providerId);
        const destProvider = this.registry.get(destRef.providerId);

        if (sourceProvider.kind === "android-adb" && destProvider.kind === "android-adb") {
          // Internal Android move
          if (sourceRef.providerId !== destRef.providerId) {
             throw new AppError("not-implemented", "Moving between different Android devices is not supported yet.");
          }
          await (sourceProvider as AndroidAdbProvider).rename(sourceRef.path, destRef.path);
          return;
        }

        // If cross-provider (Android to Desktop or vice-versa), do copy + delete
        if (sourceProvider.kind !== destProvider.kind) {
          await this.executeOperation({ ...operation, kind: "copy", id: randomUUID(), requiresConfirmation: false } as any);
          await this.executeOperation({ ...operation, kind: "delete", id: randomUUID(), requiresConfirmation: false } as any);
          return;
        }

        // Standard desktop move. fs.rename replaces an existing file on macOS and Linux,
        // so check the destination first.
        const source = this.resolveRef(sourceRef);
        const destination = this.resolveRef(destRef);
        await assertDestinationFree(destination);

        try {
          await rename(source, destination);
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;

          if (nodeError.code !== "EXDEV") {
            throw error;
          }

          await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
          await shell.trashItem(source);
        }

        return;
      }

      case "rename": {
        const sourceRef = operation.source;
        const provider = this.registry.get(sourceRef.providerId);
        const newName = assertSafeName(operation.newName);

        if (provider.kind === "android-adb") {
          const destPath = posix.join(posix.dirname(sourceRef.path), newName);
          await (provider as AndroidAdbProvider).rename(sourceRef.path, destPath);
          return;
        }

        const source = this.resolveRef(sourceRef);
        const destination = join(dirname(source), newName);
        await assertDestinationFree(destination);
        await rename(source, destination);
        return;
      }

      case "delete": {
        const sourceRef = operation.source;
        const provider = this.registry.get(sourceRef.providerId);

        if (provider.kind === "android-adb") {
          await (provider as AndroidAdbProvider).delete(sourceRef.path);
          return;
        }

        const source = this.resolveRef(sourceRef);
        await shell.trashItem(source);
        return;
      }

      case "create-folder": {
        const destRef = operation.destination;
        const provider = this.registry.get(destRef.providerId);

        if (provider.kind === "android-adb") {
          await (provider as AndroidAdbProvider).makeDirectory(destRef.path);
          return;
        }

        const destination = this.resolveRef(destRef);
        await mkdir(destination, { recursive: false });
        return;
      }

      case "create-file": {
        const destRef = operation.destination;
        const provider = this.registry.get(destRef.providerId);

        if (provider.kind === "android-adb") {
          await (provider as AndroidAdbProvider).createFile(destRef.path);
          return;
        }

        const destination = this.resolveRef(destRef);
        await writeFile(destination, "", { flag: "wx" });
        return;
      }

      case "set-tags": {
        const source = this.resolveRef(operation.source);
        await setMacOsTags(source, operation.tags);
        return;
      }

      case "pull-from-android": {
        const source = operation.source;
        const destination = this.resolveRef(operation.destination);
        const provider = this.registry.get(source.providerId);
        if (provider.kind !== "android-adb") {
          throw new AppError("invalid-request", "Source must be an Android ADB provider.");
        }
        await (provider as AndroidAdbProvider).pull(source.path, destination);
        return;
      }

      case "push-to-android": {
        const source = this.resolveRef(operation.source);
        const destination = operation.destination;
        const provider = this.registry.get(destination.providerId);
        if (provider.kind !== "android-adb") {
          throw new AppError("invalid-request", "Destination must be an Android ADB provider.");
        }
        await (provider as AndroidAdbProvider).push(source, destination.path);
        return;
      }
    }
  }
}
