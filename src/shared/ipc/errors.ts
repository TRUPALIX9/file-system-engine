export type IpcErrorCode =
  | "invalid-request"
  | "provider-not-found"
  | "path-outside-provider"
  | "permission-denied"
  | "filesystem-error"
  | "not-implemented"
  | "internal-error";

export const IPC_ERROR_MESSAGES: Record<IpcErrorCode, string> = {
  "invalid-request": "The request payload is invalid.",
  "provider-not-found": "The requested storage provider is not available.",
  "path-outside-provider": "The requested path is outside the selected storage provider.",
  "permission-denied": "The requested action is not allowed for this provider.",
  "filesystem-error": "The filesystem operation failed.",
  "not-implemented": "This feature is not implemented yet.",
  "internal-error": "An internal application error occurred."
};
