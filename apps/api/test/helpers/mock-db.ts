import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 本物のインメモリ SQLite (node:sqlite) を用いた D1Database テスト用インスタンス
 * - 起動時に apps/api/migrations 配下の全マイグレーション SQL を自動適用
 * - 手動のクエリ判定 (query.includes) を全廃し、本物の SQLite エンジンでクエリを実行
 * - D1Database の標準インターフェース (prepare, bind, all, first, run, batch, exec) に完全準拠
 */
export function createMockDB(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  // migrations ディレクトリ内の全マイグレーションを適用
  const candidateDirs = [
    path.resolve(process.cwd(), "apps/api/migrations"),
    path.resolve(process.cwd(), "migrations"),
    path.resolve(currentDir, "../../migrations"),
  ];

  let migrationsDir = "";
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      migrationsDir = dir;
      break;
    }
  }

  if (migrationsDir) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith(".sql"))
      .sort();
    for (const f of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, f), "utf-8");
      db.exec(sql);
    }
  }

  function createStatement(query: string, boundArgs: any[] = []) {
    return {
      query,
      args: boundArgs,
      bind(...args: any[]) {
        return createStatement(query, args);
      },
      async all<T = Record<string, unknown>>() {
        const stmt = db.prepare(query);
        const results = stmt.all(...boundArgs) as T[];
        return {
          results,
          success: true,
          meta: { duration: 0, rows_read: results.length, rows_written: 0 },
        };
      },
      async first<T = Record<string, unknown>>(colName?: string) {
        const stmt = db.prepare(query);
        const row = stmt.get(...boundArgs) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (colName) return (row[colName] as T) ?? null;
        return row as T;
      },
      async run() {
        const stmt = db.prepare(query);
        const info = stmt.run(...boundArgs);
        return {
          success: true,
          meta: {
            changes: info.changes,
            last_row_id: Number(info.lastInsertRowid),
            duration: 0,
            rows_read: 0,
            rows_written: info.changes,
          },
        };
      },
      async raw<T = unknown[]>() {
        const stmt = db.prepare(query);
        const results = stmt.all(...boundArgs);
        return results.map((r: any) => Object.values(r)) as T[];
      },
    };
  }

  return {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch<T = unknown>(statements: any[]) {
      const results: any[] = [];
      db.exec("BEGIN TRANSACTION;");
      try {
        for (const stmt of statements) {
          const res = await stmt.run();
          results.push(res);
        }
        db.exec("COMMIT;");
      } catch (err) {
        db.exec("ROLLBACK;");
        throw err;
      }
      return results as T[];
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 1, duration: 0 };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
  } as unknown as D1Database;
}
