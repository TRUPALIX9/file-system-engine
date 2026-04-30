import type { ISODateTime } from "./platform";

export type SupportedDocumentType = "pdf" | "docx" | "txt" | "csv" | "xlsx";

export type ParserStatus = "pending" | "parsed" | "unsupported" | "failed";

export interface DocumentTypeDetection {
  documentType?: SupportedDocumentType;
  mimeType?: string;
  extension?: string;
  confidence: number;
}

export interface TableSummary {
  sheetName?: string;
  rowCount?: number;
  columnCount?: number;
  headers: string[];
  sampleRows: string[][];
}

interface BaseDocumentExtract {
  id: string;
  fileId: string;
  parserName: string;
  status: ParserStatus;
  createdAt: ISODateTime;
}

export interface PendingDocumentExtract extends BaseDocumentExtract {
  status: "pending";
  documentType?: SupportedDocumentType;
}

export interface ParsedDocumentExtract extends BaseDocumentExtract {
  status: "parsed";
  documentType: SupportedDocumentType;
  extractedText: string;
  textCharCount: number;
  pageCount?: number;
  tableSummaries: TableSummary[];
}

export interface UnsupportedDocumentExtract extends BaseDocumentExtract {
  status: "unsupported";
  documentType?: SupportedDocumentType;
  errorMessage: string;
}

export interface FailedDocumentExtract extends BaseDocumentExtract {
  status: "failed";
  documentType?: SupportedDocumentType;
  errorMessage?: string;
}

export type DocumentExtract =
  | PendingDocumentExtract
  | ParsedDocumentExtract
  | UnsupportedDocumentExtract
  | FailedDocumentExtract;

export interface ParseDocumentRequest {
  fileId: string;
  maxCharacters?: number;
}

export interface ParseDocumentResult {
  extract: DocumentExtract;
}
