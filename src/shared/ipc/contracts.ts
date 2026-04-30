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
} from "../types";

export interface IpcSuccess<T> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
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
  operations: {
    executePlan: (
      request: ExecuteOperationPlanRequest
    ) => Promise<IpcResult<ExecuteOperationPlanResult>>;
  };
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
  "operations:execute-plan": {
    request: ExecuteOperationPlanRequest;
    response: ExecuteOperationPlanResult;
  };
}
