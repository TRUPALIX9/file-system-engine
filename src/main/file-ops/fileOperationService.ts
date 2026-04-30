import { shell } from "electron";
import { cp, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ExecuteOperationPlanRequest,
  ExecuteOperationPlanResult,
  FileOperation,
  OperationLogEntry,
  StoragePathRef
} from "@shared/types";
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

export class FileOperationService {
  constructor(private readonly registry: ProviderRegistry) {}

  private resolveRef(ref: StoragePathRef): string {
    assertDesktopRef(ref);
    const provider = this.registry.get(ref.providerId);

    if (provider.kind !== "desktop-filesystem") {
      throw new AppError("not-implemented");
    }

    if (provider.descriptor.kind !== "desktop-filesystem") {
      throw new AppError("not-implemented");
    }

    return assertPathInsideRoot(provider.descriptor.mountPath, ref.path);
  }

  private assertWritable(ref: StoragePathRef): void {
    const provider = this.registry.get(ref.providerId);

    if (!provider.descriptor.capabilities.canWrite) {
      throw new AppError("permission-denied", "This provider is read-only.");
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
        const source = this.resolveRef(operation.source);
        const destination = this.resolveRef(operation.destination);
        await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
        return;
      }

      case "move": {
        const source = this.resolveRef(operation.source);
        const destination = this.resolveRef(operation.destination);

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
        const source = this.resolveRef(operation.source);
        const destination = join(dirname(source), assertSafeName(operation.newName));
        await rename(source, destination);
        return;
      }

      case "delete": {
        const source = this.resolveRef(operation.source);
        await shell.trashItem(source);
        return;
      }

      case "create-folder": {
        const destination = this.resolveRef(operation.destination);
        await mkdir(destination, { recursive: false });
        return;
      }

      case "create-file": {
        const destination = this.resolveRef(operation.destination);
        await writeFile(destination, "", { flag: "wx" });
        return;
      }

      case "set-tags": {
        const source = this.resolveRef(operation.source);
        await setMacOsTags(source, operation.tags);
        return;
      }

      case "pull-from-android":
      case "push-to-android":
        throw new AppError("not-implemented", "Android file transfer operations are implemented in the Android phase.");
    }
  }
}
