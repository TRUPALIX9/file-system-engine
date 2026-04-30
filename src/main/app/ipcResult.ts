import { IPC_ERROR_MESSAGES, type IpcErrorCode, type IpcFailure, type IpcSuccess } from "@shared/ipc";
import { AppError } from "./AppError";

export function ok<T>(data: T): IpcSuccess<T> {
  return { ok: true, data };
}

export function fail(code: IpcErrorCode, message = IPC_ERROR_MESSAGES[code], details?: unknown): IpcFailure {
  return {
    ok: false,
    error: {
      code,
      message,
      details
    }
  };
}

export function toIpcFailure(error: unknown): IpcFailure {
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.details);
  }

  if (error instanceof Error) {
    return fail("internal-error", error.message);
  }

  return fail("internal-error", "An unknown application error occurred.");
}
