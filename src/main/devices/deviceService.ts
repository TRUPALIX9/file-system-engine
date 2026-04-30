import type { BrowseRequest, BrowseResult, DeviceInventory } from "@shared/types";
import { detectMountedFilesystems } from "./driveDetector";
import { DesktopFilesystemProvider } from "@main/providers/DesktopFilesystemProvider";
import { ProviderRegistry } from "@main/providers/providerRegistry";

export class DeviceService {
  private readonly registry = new ProviderRegistry();

  async refreshInventory(): Promise<DeviceInventory> {
    const mountedFilesystems = await detectMountedFilesystems();
    const providers = mountedFilesystems.map((descriptor) => new DesktopFilesystemProvider(descriptor));

    this.registry.replace(providers);

    return {
      mountedFilesystems,
      androidDevices: [],
      allProviders: mountedFilesystems,
      refreshedAt: new Date().toISOString()
    };
  }

  async browse(request: BrowseRequest): Promise<BrowseResult> {
    if (!this.registry.has(request.location.providerId)) {
      await this.refreshInventory();
    }

    const provider = this.registry.get(request.location.providerId);
    return provider.browse(request);
  }
}
