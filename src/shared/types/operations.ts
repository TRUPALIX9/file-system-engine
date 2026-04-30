import type { ISODateTime } from "./platform";
import type { StoragePathRef } from "./provider";

export type FileOperationKind =
  | "copy"
  | "move"
  | "rename"
  | "delete"
  | "create-folder"
  | "create-file"
  | "set-tags"
  | "pull-from-android"
  | "push-to-android";

export type FileOperationStatus =
  | "planned"
  | "awaiting-confirmation"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

interface BaseFileOperation {
  id: string;
  destructive: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

export interface CopyOperation extends BaseFileOperation {
  kind: "copy";
  source: StoragePathRef;
  destination: StoragePathRef;
}

export interface MoveOperation extends BaseFileOperation {
  kind: "move";
  source: StoragePathRef;
  destination: StoragePathRef;
}

export interface RenameOperation extends BaseFileOperation {
  kind: "rename";
  source: StoragePathRef;
  newName: string;
}

export interface DeleteOperation extends BaseFileOperation {
  kind: "delete";
  source: StoragePathRef;
}

export interface CreateFolderOperation extends BaseFileOperation {
  kind: "create-folder";
  destination: StoragePathRef;
}

export interface CreateFileOperation extends BaseFileOperation {
  kind: "create-file";
  destination: StoragePathRef;
}

export interface SetTagsOperation extends BaseFileOperation {
  kind: "set-tags";
  source: StoragePathRef;
  tags: string[];
}

export interface PullFromAndroidOperation extends BaseFileOperation {
  kind: "pull-from-android";
  source: StoragePathRef;
  destination: StoragePathRef;
}

export interface PushToAndroidOperation extends BaseFileOperation {
  kind: "push-to-android";
  source: StoragePathRef;
  destination: StoragePathRef;
}

export type FileOperation =
  | CopyOperation
  | MoveOperation
  | RenameOperation
  | DeleteOperation
  | CreateFolderOperation
  | CreateFileOperation
  | SetTagsOperation
  | PullFromAndroidOperation
  | PushToAndroidOperation;

export interface FileOperationPlan {
  id: string;
  operations: FileOperation[];
  status: FileOperationStatus;
  createdAt: ISODateTime;
  confirmedAt?: ISODateTime;
}

export interface ExecuteOperationPlanRequest {
  planId: string;
  operations: FileOperation[];
  confirmed: boolean;
}

export interface OperationLogEntry {
  id: string;
  planId?: string;
  operationId: string;
  kind: FileOperationKind;
  status: FileOperationStatus;
  source?: StoragePathRef;
  destination?: StoragePathRef;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  reversible: boolean;
  errorMessage?: string;
}

export interface ExecuteOperationPlanResult {
  planId: string;
  status: FileOperationStatus;
  logs: OperationLogEntry[];
}
