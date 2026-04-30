import { z } from "zod";
import { IPC_CHANNELS } from "@shared/ipc/channels";

const storageProviderKindSchema = z.enum([
  "desktop-filesystem",
  "android-adb",
  "android-mtp",
  "cloud"
]);

const storagePathRefSchema = z
  .object({
    providerId: z.string().min(1).max(512),
    providerKind: storageProviderKindSchema,
    path: z.string().min(1).max(8192),
    displayPath: z.string().max(8192).optional()
  })
  .strict();

export const browseRequestSchema = z
  .object({
    location: storagePathRefSchema,
    pageToken: z.string().min(1).max(512).optional(),
    includeHidden: z.boolean().optional()
  })
  .strict();

export const scanOptionsSchema = z
  .object({
    includeHidden: z.boolean(),
    recursive: z.boolean(),
    computeHashes: z.boolean(),
    parseDocuments: z.boolean(),
    requestAiSuggestions: z.boolean(),
    maxDepth: z.number().int().min(0).max(64).optional()
  })
  .strict();

export const startScanRequestSchema = z
  .object({
    target: z
      .object({
        root: storagePathRefSchema,
        label: z.string().max(256).optional()
      })
      .strict(),
    options: scanOptionsSchema
  })
  .strict();

export const getScanRequestSchema = z
  .object({
    scanJobId: z.string().min(1).max(256)
  })
  .strict();

export const findDuplicatesRequestSchema = z
  .object({
    scanJobId: z.string().min(1).max(256),
    includeNearDuplicates: z.boolean()
  })
  .strict();

export const aiTaskRequestSchema = z
  .object({
    task: z.enum([
      "classify-document",
      "summarize-document",
      "suggest-folder",
      "suggest-rename",
      "compare-files-semantically",
      "explain-duplicate-group"
    ]),
    fileId: z.string().min(1).max(256).optional(),
    duplicateGroupId: z.string().min(1).max(256).optional(),
    extractedText: z.string().max(250000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export const executeOperationPlanRequestSchema = z
  .object({
    planId: z.string().min(1).max(256),
    confirmed: z.boolean()
  })
  .strict();

export const ipcRequestSchemas = {
  [IPC_CHANNELS.devicesList]: z.undefined(),
  [IPC_CHANNELS.browse]: browseRequestSchema,
  [IPC_CHANNELS.scanStart]: startScanRequestSchema,
  [IPC_CHANNELS.scanGet]: getScanRequestSchema,
  [IPC_CHANNELS.duplicatesFind]: findDuplicatesRequestSchema,
  [IPC_CHANNELS.aiStatus]: z.undefined(),
  [IPC_CHANNELS.aiRunTask]: aiTaskRequestSchema,
  [IPC_CHANNELS.operationsExecutePlan]: executeOperationPlanRequestSchema
} as const;

export type IpcRequestSchemas = typeof ipcRequestSchemas;
