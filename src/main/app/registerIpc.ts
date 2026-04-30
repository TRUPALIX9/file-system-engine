import { ipcMain, shell } from "electron";
import { randomUUID } from "node:crypto";
import { IPC_CHANNELS, type IpcContractMap } from "@shared/ipc";
import {
  type ExecuteOperationPlanResult,
  type FindDuplicatesResult,
  type LlmProviderStatus,
  type ScanJob,
  type StartScanResult
} from "@shared/types";
import { DeviceService } from "@main/devices/deviceService";
import { validateIpcRequest } from "@main/security/ipcValidation";
import { ok, toIpcFailure } from "./ipcResult";

type IpcHandler<TChannel extends keyof IpcContractMap> = (
  request: IpcContractMap[TChannel]["request"]
) => Promise<IpcContractMap[TChannel]["response"]> | IpcContractMap[TChannel]["response"];

function handle<TChannel extends keyof IpcContractMap>(
  channel: TChannel,
  handler: IpcHandler<TChannel>
): void {
  ipcMain.handle(channel, async (_event, rawRequest: unknown) => {
    try {
      const request = validateIpcRequest(channel, rawRequest);
      const response = await handler(request);
      return ok(response);
    } catch (error) {
      return toIpcFailure(error);
    }
  });
}

const deviceService = new DeviceService();

export function registerIpcHandlers(): void {
  handle(IPC_CHANNELS.devicesList, () => deviceService.refreshInventory());

  handle(IPC_CHANNELS.browse, (request) => deviceService.browse(request));

  handle(IPC_CHANNELS.analyzeStorage, (request) => deviceService.analyze(request));

  handle(IPC_CHANNELS.scanStart, (request): StartScanResult => {
    const now = new Date().toISOString();

    return {
      job: {
        id: randomUUID(),
        target: request.target,
        options: request.options,
        status: "queued",
        startedAt: now
      }
    };
  });

  handle(IPC_CHANNELS.scanGet, (request): ScanJob => ({
    id: request.scanJobId,
    target: {
      root: {
        providerId: "unavailable",
        providerKind: "desktop-filesystem",
        path: ""
      }
    },
    options: {
      includeHidden: false,
      recursive: true,
      computeHashes: true,
      parseDocuments: true,
      requestAiSuggestions: false
    },
    status: "failed",
    errorMessage: "Scan persistence is not implemented until the service layer phase."
  }));

  handle(IPC_CHANNELS.duplicatesFind, (request): FindDuplicatesResult => ({
    groups: [],
    summary: {
      scanJobId: request.scanJobId,
      exactGroups: 0,
      renamedGroups: 0,
      copyVersionGroups: 0,
      nearDuplicateGroups: 0,
      reviewedGroups: 0
    }
  }));

  handle(IPC_CHANNELS.aiStatus, (): LlmProviderStatus => ({
    kind: "ollama",
    availability: "missing",
    checkedAt: new Date().toISOString(),
    errorMessage: "Ollama integration is not implemented until the AI layer phase."
  }));

  handle(IPC_CHANNELS.aiRunTask, () => ({
    status: "skipped",
    errorMessage: "AI task execution is not implemented until the AI layer phase."
  }));

  handle(IPC_CHANNELS.appOpenExternal, async (request) => {
    await shell.openExternal(request.url);

    return {
      opened: true
    } as const;
  });

  handle(IPC_CHANNELS.operationsExecutePlan, (request): Promise<ExecuteOperationPlanResult> =>
    deviceService.executeOperationPlan(request)
  );
}
