export const IPC_CHANNELS = {
  devicesList: "devices:list",
  browse: "storage:browse",
  analyzeStorage: "storage:analyze",
  scanStart: "scan:start",
  scanGet: "scan:get",
  duplicatesFind: "duplicates:find",
  aiStatus: "ai:status",
  aiRunTask: "ai:run-task",
  appOpenExternal: "app:open-external",
  operationsExecutePlan: "operations:execute-plan",
  recordsGet: "records:get",
  appShowOpenDialog: "app:show-open-dialog",
  devicesUpdated: "devices:updated"
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
