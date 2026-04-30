import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type FileSystemEngineApi, type IpcChannel, type IpcResult } from "@shared/ipc";
import type {
  AiTaskRequest,
  AiTaskResult,
  BrowseRequest,
  BrowseResult,
  DeviceInventory,
  ExecuteOperationPlanRequest,
  ExecuteOperationPlanResult,
  FindDuplicatesRequest,
  FindDuplicatesResult,
  GetScanRequest,
  LlmProviderStatus,
  ScanJob,
  StartScanRequest,
  StartScanResult
} from "@shared/types";

async function invoke<TResponse>(channel: IpcChannel, request?: unknown): Promise<IpcResult<TResponse>> {
  return ipcRenderer.invoke(channel, request) as Promise<IpcResult<TResponse>>;
}

export const fileSystemEngineApi: FileSystemEngineApi = {
  devices: {
    list: () => invoke<DeviceInventory>(IPC_CHANNELS.devicesList)
  },
  storage: {
    browse: (request: BrowseRequest) => invoke<BrowseResult>(IPC_CHANNELS.browse, request)
  },
  scans: {
    start: (request: StartScanRequest) => invoke<StartScanResult>(IPC_CHANNELS.scanStart, request),
    get: (request: GetScanRequest) => invoke<ScanJob>(IPC_CHANNELS.scanGet, request)
  },
  duplicates: {
    find: (request: FindDuplicatesRequest) =>
      invoke<FindDuplicatesResult>(IPC_CHANNELS.duplicatesFind, request)
  },
  ai: {
    status: () => invoke<LlmProviderStatus>(IPC_CHANNELS.aiStatus),
    runTask: (request: AiTaskRequest) => invoke<AiTaskResult>(IPC_CHANNELS.aiRunTask, request)
  },
  operations: {
    executePlan: (request: ExecuteOperationPlanRequest) =>
      invoke<ExecuteOperationPlanResult>(IPC_CHANNELS.operationsExecutePlan, request)
  }
};

export function exposeFileSystemEngineApi(): void {
  contextBridge.exposeInMainWorld("fileSystemEngine", fileSystemEngineApi);
}

