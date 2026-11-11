import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

const DB_DIR = path.dirname(config.databasePath);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db: Database.Database = new Database(config.databasePath);

// Enable WAL mode for high concurrency and foreign key enforcement
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
