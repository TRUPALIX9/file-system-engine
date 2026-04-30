import { getDatabase } from "./db";
import type { ActivityRecord, GetRecordsRequest, GetRecordsResponse } from "@shared/types";
import { nanoid } from "nanoid";

export class RecordsService {
  addRecord(record: Omit<ActivityRecord, "id" | "timestamp">) {
    const db = getDatabase();
    const id = nanoid();
    const timestamp = new Date().toISOString();
    
    const stmt = db.prepare(
      "INSERT INTO records (id, kind, timestamp, description, details) VALUES (?, ?, ?, ?, ?)"
    );
    
    stmt.run(
      id,
      record.kind,
      timestamp,
      record.description,
      record.details ? JSON.stringify(record.details) : null
    );
    
    return { id, timestamp, ...record };
  }

  getRecords(request: GetRecordsRequest): GetRecordsResponse {
    const db = getDatabase();
    
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM records");
    const { count } = countStmt.get() as { count: number };
    
    const stmt = db.prepare(
      "SELECT id, kind, timestamp, description, details FROM records ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    );
    
    const rows = stmt.all(request.limit, request.offset) as any[];
    
    const records = rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : undefined
    }));
    
    return {
      records,
      totalCount: count
    };
  }
}

export const recordsService = new RecordsService();
