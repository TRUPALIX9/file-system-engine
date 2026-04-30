export type ActivityRecord = {
  id: string;
  kind: "scan" | "operation" | "suggestion-applied";
  timestamp: string;
  description: string;
  details?: Record<string, unknown>;
};

export type GetRecordsRequest = {
  limit: number;
  offset: number;
};

export type GetRecordsResponse = {
  records: ActivityRecord[];
  totalCount: number;
};
