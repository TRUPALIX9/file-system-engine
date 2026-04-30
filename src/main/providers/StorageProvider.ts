import type {
  BrowseRequest,
  BrowseResult,
  StorageProviderDescriptor,
  StorageProviderKind
} from "@shared/types";

export interface StorageProvider {
  readonly id: string;
  readonly kind: StorageProviderKind;
  readonly descriptor: StorageProviderDescriptor;
  browse(request: BrowseRequest): Promise<BrowseResult>;
}
