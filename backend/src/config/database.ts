
import initSqlJs, {
  type Database as SqlJsDatabase,
  type SqlValue,
} from "sql.js";
import fs from "fs";
import path from "path";
import { env } from "./env";

const dbPath = path.isAbsolute(env.DATABASE_PATH)
  ? env.DATABASE_PATH
  : path.resolve(__dirname, "../../", env.DATABASE_PATH);

class PersistentDatabase {
  private connection: SqlJsDatabase | null = null;

  private get database(): SqlJsDatabase {
    if (!this.connection) {
      throw new Error(
        "Database is not initialized. Call initDatabase() first."
      );
    }
    return this.connection;
  }

  async initialize(): Promise<void> {
    const directory = path.dirname(dbPath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
      const fileData = fs.readFileSync(dbPath);
      this.connection = new SQL.Database(fileData);
    } else {
      this.connection = new SQL.Database();
    }

    this.database.run("PRAGMA foreign_keys = ON");

    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        buyerId TEXT NOT NULL,
        sellerId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(buyerId, sellerId),
        FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
        CHECK(buyerId != sellerId)
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_buyer
      ON conversations(buyerId);

      CREATE INDEX IF NOT EXISTS idx_conversations_seller
      ON conversations(sellerId);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (conversationId)
          REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (senderId)
          REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversationId, createdAt);
    `);

    this.save();
    console.log("SQLite database initialized successfully.");
  }

  prepare<
    BindParameters extends unknown[] = unknown[],
    Result = Record<string, unknown>
  >(sql: string): {
    get: (...params: BindParameters) => Result | undefined;
    all: (...params: BindParameters) => Result[];
    run: (...params: BindParameters) => void;
  } {
    return {
      get: (...params: BindParameters): Result | undefined => {
        const statement = this.database.prepare(sql);

        try {
          statement.bind(params as SqlValue[]);

          if (statement.step()) {
            return statement.getAsObject() as Result;
          }

          return undefined;
        } finally {
          statement.free();
        }
      },

      all: (...params: BindParameters): Result[] => {
        const statement = this.database.prepare(sql);
        const results: Result[] = [];

        try {
          statement.bind(params as SqlValue[]);

          while (statement.step()) {
            results.push(statement.getAsObject() as Result);
          }

          return results;
        } finally {
          statement.free();
        }
      },

      run: (...params: BindParameters): void => {
        this.database.run(sql, params as SqlValue[]);
        this.save();
      },
    };
  }

  exec(sql: string): void {
    this.database.exec(sql);
    this.save();
  }

  pragma(setting: string): void {
    this.database.exec(`PRAGMA ${setting}`);
  }

  save(): void {
    if (!this.connection) return;

    const exportedData = this.database.export();
    fs.writeFileSync(dbPath, Buffer.from(exportedData));
  }

  close(): void {
    if (!this.connection) return;

    this.save();
    this.database.close();
    this.connection = null;
  }
}

const persistentDatabase = new PersistentDatabase();

export const db = persistentDatabase;

export async function initDatabase(): Promise<void> {
  await persistentDatabase.initialize();
}
