import { describe, expect, it } from "vitest";
import app from "../src/index";

// テスト用インメモリ D1 モック
function createMockDB() {
  const stocks: any[] = [];
  let userStats = {
    score: 0,
    total_stocks: 0,
    rediscovery_count: 0,
    current_streak: 0,
    max_streak: 0,
    last_stock_date: null,
  };

  return {
    prepare(query: string) {
      return {
        bind(...args: any[]) {
          return {
            async all() {
              if (query.includes("FROM stocks")) {
                return { results: [...stocks].reverse() };
              }
              return { results: [] };
            },
            async first() {
              if (query.includes("FROM user_stats")) {
                return userStats;
              }
              return null;
            },
            async run() {
              if (query.includes("DELETE FROM stocks")) {
                const id = args[0];
                const idx = stocks.findIndex((s) => s.id === id);
                if (idx !== -1) stocks.splice(idx, 1);
                return { success: true };
              }
              return { success: true };
            },
          };
        },
        async all() {
          if (query.includes("FROM stocks")) {
            return { results: [...stocks].reverse() };
          }
          return { results: [] };
        },
        async first() {
          if (query.includes("FROM user_stats")) {
            return userStats;
          }
          return null;
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        // INSERT stocks
        if (
          stmt.query?.includes("INSERT INTO stocks") ||
          stmt._query?.includes("INSERT INTO stocks")
        ) {
          const args = stmt.args || stmt._args;
          stocks.push({
            id: args[0],
            content: args[1],
            created_at: args[2],
            updated_at: args[3],
          });
        }
        // UPDATE user_stats (加算)
        if (stmt.query?.includes("total_stocks + 1") || stmt._query?.includes("total_stocks + 1")) {
          userStats.total_stocks += 1;
          userStats.score += 10;
        }
        // UPDATE user_stats (減算)
        if (stmt.query?.includes("total_stocks - 1") || stmt._query?.includes("total_stocks - 1")) {
          userStats.total_stocks = Math.max(0, userStats.total_stocks - 1);
        }
        // DELETE
        if (
          stmt.query?.includes("DELETE FROM stocks") ||
          stmt._query?.includes("DELETE FROM stocks")
        ) {
          const args = stmt.args || stmt._args;
          const id = args[0];
          const idx = stocks.findIndex((s) => s.id === id);
          if (idx !== -1) stocks.splice(idx, 1);
        }
      }
      return [];
    },
  } as unknown as D1Database;
}

describe("Stockly API Endpoints", () => {
  it("GET /api/health should return ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.time).toBeDefined();
  });

  it("GET /api/stocks should return empty list initially", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/api/stocks", {}, { DB: mockDB });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.stocks).toEqual([]);
  });

  it("POST /api/stocks should validate empty content", async () => {
    const mockDB = createMockDB();
    const res = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      },
      { DB: mockDB },
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/stocks should create a new stock", async () => {
    const mockDB = createMockDB();
    const res = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "テスト内省メモ" }),
      },
      { DB: mockDB },
    );
    expect(res.status).toBe(201);

    const created = (await res.json()) as any;
    expect(created.id).toBeDefined();
    expect(created.content).toBe("テスト内省メモ");
    expect(created.created_at).toBeDefined();
  });

  it("GET /api/stats should return stats", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/api/stats", {}, { DB: mockDB });
    expect(res.status).toBe(200);

    const stats = (await res.json()) as any;
    expect(stats.score).toBe(0);
    expect(stats.total_stocks).toBe(0);
  });

  it("DELETE /api/stocks/:id should delete an existing stock", async () => {
    const mockDB = createMockDB();
    // まず作成
    const postRes = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "削除対象のメモ" }),
      },
      { DB: mockDB },
    );
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()) as any;

    // 削除実行
    const delRes = await app.request(
      `/api/stocks/${created.id}`,
      { method: "DELETE" },
      { DB: mockDB },
    );
    expect(delRes.status).toBe(200);
    const delData = (await delRes.json()) as any;
    expect(delData.success).toBe(true);

    // 削除後に一覧取得
    const listRes = await app.request("/api/stocks", {}, { DB: mockDB });
    const listData = (await listRes.json()) as any;
    expect(listData.stocks).toHaveLength(0);
  });
});
