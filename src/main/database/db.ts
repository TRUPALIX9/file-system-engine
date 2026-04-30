import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "node:path";

let dbInstance: ReturnType<typeof Database> | null = null;

export function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = join(app.getPath("userData"), "engine.sqlite");
  dbInstance = new Database(dbPath);

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      description TEXT NOT NULL,
      details TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_timestamp ON records(timestamp DESC);
  `);

  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
