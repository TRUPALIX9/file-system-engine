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

export const storageAnalysisRequestSchema = z
  .object({
    root: storagePathRefSchema,
    includeHidden: z.boolean(),
    maxEntries: z.number().int().min(1).max(250000),
    maxDepth: z.number().int().min(0).max(64),
    query: z.string().max(256).optional()
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
    operations: z
      .array(
        z.discriminatedUnion("kind", [
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("copy"),
              source: storagePathRefSchema,
              destination: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("move"),
              source: storagePathRefSchema,
              destination: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("rename"),
              source: storagePathRefSchema,
              newName: z.string().min(1).max(255),
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("delete"),
              source: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("create-folder"),
              destination: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("create-file"),
              destination: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("set-tags"),
              source: storagePathRefSchema,
              tags: z.array(z.string().min(1).max(128)).max(32),
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("pull-from-android"),
              source: storagePathRefSchema,
              destination: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict(),
          z
            .object({
              id: z.string().min(1).max(256),
              kind: z.literal("push-to-android"),
              source: storagePathRefSchema,
              destination: storagePathRefSchema,
              destructive: z.boolean(),
              requiresConfirmation: z.boolean(),
              reason: z.string().max(512).optional()
            })
            .strict()
        ])
      )
      .min(1)
      .max(500),
    confirmed: z.boolean()
  })
  .strict();

export const openExternalRequestSchema = z
  .object({
    url: z.string().max(2048).refine(val => val.startsWith("https://") || val.startsWith("x-apple.systempreferences:"), {
      message: "URL must be https:// or x-apple.systempreferences:"
    })
  })
  .strict();

export const getRecordsRequestSchema = z
  .object({
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0)
  })
  .strict();

export const showOpenDialogSchema = z
  .object({
    properties: z.array(z.string()).optional(),
    title: z.string().optional(),
    buttonLabel: z.string().optional()
  })
  .strict();

export const ipcRequestSchemas = {
  [IPC_CHANNELS.devicesList]: z.undefined(),
  [IPC_CHANNELS.browse]: browseRequestSchema,
  [IPC_CHANNELS.analyzeStorage]: storageAnalysisRequestSchema,
  [IPC_CHANNELS.scanStart]: startScanRequestSchema,
  [IPC_CHANNELS.scanGet]: getScanRequestSchema,
  [IPC_CHANNELS.duplicatesFind]: findDuplicatesRequestSchema,
  [IPC_CHANNELS.aiStatus]: z.undefined(),
  [IPC_CHANNELS.aiRunTask]: aiTaskRequestSchema,
  [IPC_CHANNELS.appOpenExternal]: openExternalRequestSchema,
  [IPC_CHANNELS.operationsExecutePlan]: executeOperationPlanRequestSchema,
  [IPC_CHANNELS.recordsGet]: getRecordsRequestSchema,
  [IPC_CHANNELS.appShowOpenDialog]: showOpenDialogSchema
} as const;

export type IpcRequestSchemas = typeof ipcRequestSchemas;
