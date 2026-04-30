import type {
  AiTaskRequest,
  AiTaskResult,
  StorageAnalysisRequest,
  StorageAnalysisResult,
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
} from "../types";
import type { IpcErrorCode } from "./errors";

export interface IpcSuccess<T> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: IpcErrorCode;
    message: string;
    details?: unknown;
  };
}

export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

export interface FileSystemEngineApi {
  devices: {
    list: () => Promise<IpcResult<DeviceInventory>>;
  };
  storage: {
    browse: (request: BrowseRequest) => Promise<IpcResult<BrowseResult>>;
    analyze: (request: StorageAnalysisRequest) => Promise<IpcResult<StorageAnalysisResult>>;
  };
  scans: {
    start: (request: StartScanRequest) => Promise<IpcResult<StartScanResult>>;
    get: (request: GetScanRequest) => Promise<IpcResult<ScanJob>>;
  };
  duplicates: {
    find: (request: FindDuplicatesRequest) => Promise<IpcResult<FindDuplicatesResult>>;
  };
  ai: {
    status: () => Promise<IpcResult<LlmProviderStatus>>;
    runTask: (request: AiTaskRequest) => Promise<IpcResult<AiTaskResult>>;
  };
  app: {
    openExternal: (request: OpenExternalRequest) => Promise<IpcResult<OpenExternalResult>>;
  };
  operations: {
    executePlan: (
      request: ExecuteOperationPlanRequest
    ) => Promise<IpcResult<ExecuteOperationPlanResult>>;
  };
}

export interface OpenExternalRequest {
  url: string;
}

export interface OpenExternalResult {
  opened: true;
}

export interface IpcContractMap {
  "devices:list": {
    request: void;
    response: DeviceInventory;
  };
  "storage:browse": {
    request: BrowseRequest;
    response: BrowseResult;
  };
  "storage:analyze": {
    request: StorageAnalysisRequest;
    response: StorageAnalysisResult;
  };
  "scan:start": {
    request: StartScanRequest;
    response: StartScanResult;
  };
  "scan:get": {
    request: GetScanRequest;
    response: ScanJob;
  };
  "duplicates:find": {
    request: FindDuplicatesRequest;
    response: FindDuplicatesResult;
  };
  "ai:status": {
    request: void;
    response: LlmProviderStatus;
  };
  "ai:run-task": {
    request: AiTaskRequest;
    response: AiTaskResult;
  };
  "app:open-external": {
    request: OpenExternalRequest;
    response: OpenExternalResult;
  };
  "operations:execute-plan": {
    request: ExecuteOperationPlanRequest;
    response: ExecuteOperationPlanResult;
  };
}
