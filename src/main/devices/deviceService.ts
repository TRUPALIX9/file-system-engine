import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  BrowseRequest,
  BrowseResult,
  DeviceInventory,
  ExecuteOperationPlanRequest,
  ExecuteOperationPlanResult,
  MountedFilesystemDescriptor,
  StorageAnalysisRequest,
  StorageAnalysisResult
} from "@shared/types";
import { describeDesktopPath, detectMountedFilesystems } from "./driveDetector";
import { DesktopFilesystemProvider } from "@main/providers/DesktopFilesystemProvider";
import { ProviderRegistry } from "@main/providers/providerRegistry";
import { AndroidAdbProvider } from "@main/providers/AndroidAdbProvider";
import { FileOperationService } from "@main/file-ops/fileOperationService";
import { StorageAnalysisService } from "@main/storage/storageAnalysisService";
import { recordsService } from "@main/database/recordsService";
import { detectAndroidDevices } from "./adbDetector";

async function existingKnownFolders(): Promise<MountedFilesystemDescriptor[]> {
  const home = homedir();
  const candidates = [
    ["Computer", process.platform === "win32" ? "C:\\" : "/"],
    ["Home", home],
    ["Downloads", join(home, "Downloads")],
    ["Documents", join(home, "Documents")],
    ["Desktop", join(home, "Desktop")]
  ] as const;
  const folders: MountedFilesystemDescriptor[] = [];

  for (const [label, path] of candidates) {
    try {
      await access(path);
      folders.push(await describeDesktopPath(path, label, label === "Home"));
    } catch {
      // Ignore missing standard folders.
    }
  }

  return folders;
}

export class DeviceService {
  private readonly registry = new ProviderRegistry();
  private readonly fileOperations = new FileOperationService(this.registry);
  private readonly storageAnalysis = new StorageAnalysisService(this.registry);

  async refreshInventory(): Promise<DeviceInventory> {
    const [mountedFilesystems, knownFolders, androidDevices] = await Promise.all([
      detectMountedFilesystems(),
      existingKnownFolders(),
      detectAndroidDevices()
    ]);
    const desktopDescriptors = [...mountedFilesystems, ...knownFolders];
    
    const desktopProviders = desktopDescriptors.map((descriptor) => new DesktopFilesystemProvider(descriptor));
    const adbProviders = androidDevices.map((descriptor) => new AndroidAdbProvider(descriptor));
    
    this.registry.replace([...desktopProviders, ...adbProviders]);

    return {
      mountedFilesystems,
      knownFolders,
      androidDevices,
      allProviders: [...desktopDescriptors, ...androidDevices],
      refreshedAt: new Date().toISOString()
    };
  }

  async browse(request: BrowseRequest): Promise<BrowseResult> {
    try {
      if (!this.registry.has(request.location.providerId)) {
        console.log(`DeviceService: Provider ${request.location.providerId} not found in registry. Refreshing...`);
        await this.refreshInventory();
      }

      const provider = this.registry.get(request.location.providerId);
      return await provider.browse(request);
    } catch (error) {
      console.error(`DeviceService: Browse failed for provider ${request.location.providerId}:`, error);
      throw error;
    }
  }

  async analyze(request: StorageAnalysisRequest): Promise<StorageAnalysisResult> {
    if (!this.registry.has(request.root.providerId)) {
      await this.refreshInventory();
    }

    const result = await this.storageAnalysis.analyze(request);
    
    recordsService.addRecord({
      kind: "scan",
      description: `Analyzed storage at ${request.root.path}`,
      details: { totalBytes: result.totalBytes, fileCount: result.fileCount }
    });

    return result;
  }

  async executeOperationPlan(
    request: ExecuteOperationPlanRequest
  ): Promise<ExecuteOperationPlanResult> {
    if (request.operations.some((operation) => {
      const providerId =
        "destination" in operation && operation.destination
          ? operation.destination.providerId
          : "source" in operation
            ? operation.source.providerId
            : undefined;

      return providerId ? !this.registry.has(providerId) : false;
    })) {
      await this.refreshInventory();
    }

    const result = await this.fileOperations.executePlan(request);
    
    recordsService.addRecord({
      kind: "operation",
      description: `Executed ${request.operations.length} file operation(s)`,
      details: { operations: request.operations.map(o => o.kind), status: result.status }
    });

    return result;
  }
}
