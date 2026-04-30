import { IPC_ERROR_MESSAGES, type IpcErrorCode } from "@shared/ipc";

export class AppError extends Error {
  readonly code: IpcErrorCode;
  readonly details?: unknown;

  constructor(code: IpcErrorCode, message = IPC_ERROR_MESSAGES[code], details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}
