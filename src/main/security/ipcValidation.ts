import type { IpcContractMap } from "@shared/ipc";
import { ipcRequestSchemas } from "@shared/validation/ipcSchemas";
import { AppError } from "@main/app/AppError";

export function validateIpcRequest<TChannel extends keyof IpcContractMap>(
  channel: TChannel,
  request: unknown
): IpcContractMap[TChannel]["request"] {
  const schema = ipcRequestSchemas[channel];
  const result = schema.safeParse(request);

  if (!result.success) {
    throw new AppError("invalid-request", "The IPC request payload failed validation.", {
      channel,
      issues: result.error.issues
    });
  }

  return result.data as IpcContractMap[TChannel]["request"];
}
