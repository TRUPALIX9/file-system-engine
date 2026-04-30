import type { IpcFailure, IpcSuccess } from "@shared/ipc";

export function ok<T>(data: T): IpcSuccess<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string, details?: unknown): IpcFailure {
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
  if (error instanceof Error) {
    return fail("internal-error", error.message);
  }

  return fail("internal-error", "An unknown application error occurred.");
}

