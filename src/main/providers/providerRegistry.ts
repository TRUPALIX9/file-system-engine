import type { StorageProvider } from "./StorageProvider";
import { AppError } from "@main/app/AppError";

export class ProviderRegistry {
  private readonly providers = new Map<string, StorageProvider>();

  replace(providers: StorageProvider[]): void {
    this.providers.clear();

    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  get(providerId: string): StorageProvider {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new AppError("provider-not-found");
    }

    return provider;
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  all(): StorageProvider[] {
    return Array.from(this.providers.values());
  }
}
