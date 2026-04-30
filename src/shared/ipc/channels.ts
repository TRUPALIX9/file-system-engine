export const IPC_CHANNELS = {
  devicesList: "devices:list",
  browse: "storage:browse",
  scanStart: "scan:start",
  scanGet: "scan:get",
  duplicatesFind: "duplicates:find",
  aiStatus: "ai:status",
  aiRunTask: "ai:run-task",
  operationsExecutePlan: "operations:execute-plan"
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

