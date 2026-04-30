import type { RuntimeAvailability, ISODateTime } from "./platform";

export type LlmProviderKind = "ollama" | "remote";

export type AiTaskKind =
  | "classify-document"
  | "summarize-document"
  | "suggest-folder"
  | "suggest-rename"
  | "compare-files-semantically"
  | "explain-duplicate-group";

export interface LlmProviderStatus {
  kind: LlmProviderKind;
  availability: RuntimeAvailability;
  model?: string;
  checkedAt: ISODateTime;
  errorMessage?: string;
}

export interface AiSuggestion {
  id: string;
  fileId?: string;
  duplicateGroupId?: string;
  task: AiTaskKind;
  title?: string;
  summary?: string;
  category?: string;
  suggestedFolder?: string;
  suggestedFilename?: string;
  confidence: number;
  explanation: string;
  model?: string;
  createdAt: ISODateTime;
}

export interface AiDocumentInsight {
  fileId: string;
  title: string;
  summary: string;
  category: string;
  suggestedFolder: string;
  suggestedFilename?: string;
  confidence: number;
  explanation: string;
}

export interface AiTaskRequest {
  task: AiTaskKind;
  fileId?: string;
  duplicateGroupId?: string;
  extractedText?: string;
  metadata?: Record<string, unknown>;
}

export interface AiTaskResult {
  status: "completed" | "skipped" | "failed";
  suggestion?: AiSuggestion;
  errorMessage?: string;
}

