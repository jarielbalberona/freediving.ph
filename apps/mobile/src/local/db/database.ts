import * as SQLite from "expo-sqlite";

import { LOCAL_SCHEMA_VERSION } from "@/local/db/types";

const DATABASE_NAME = "freediving_mobile_local.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
let initError: Error | undefined;

export class LocalDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "LocalDatabaseError";
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

const createTables = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS local_drafts (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_drafts_type_status
      ON local_drafts(type, status);

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_created
      ON sync_outbox(status, created_at);

    CREATE TABLE IF NOT EXISTS local_media_queue (
      id TEXT PRIMARY KEY NOT NULL,
      local_uri TEXT NOT NULL,
      upload_intent TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      status TEXT NOT NULL,
      remote_media_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_media_queue_status
      ON local_media_queue(status, created_at);
  `);
};

export const initLocalDatabase = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await createTables(db);
    await db.execAsync(`PRAGMA user_version = ${LOCAL_SCHEMA_VERSION};`);
    initError = undefined;
    return db;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    throw new LocalDatabaseError("Local drafts could not be opened.", {
      cause: error,
    });
  }
};

export const getLocalDatabase = async () => {
  dbPromise ??= initLocalDatabase();
  return dbPromise;
};

export const getLocalDatabaseInitError = () => initError;
