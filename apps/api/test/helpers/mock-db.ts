/**
 * テスト用インメモリ D1 モックデータベース
 */
export function createMockDB() {
  const stocks: any[] = [];
  const userStats = {
    id: "default",
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
        query,
        bind(...args: any[]) {
          return {
            query,
            args,
            async all() {
              if (query.includes("FROM stocks")) {
                return { results: [...stocks].reverse() };
              }
              return { results: [] };
            },
            async first() {
              if (query.includes("FROM user_stats")) {
                return { ...userStats };
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
            return { ...userStats };
          }
          return null;
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        const q = stmt.query || stmt._query || "";
        const args = stmt.args || stmt._args || [];

        // INSERT INTO stocks
        if (q.includes("INSERT INTO stocks")) {
          stocks.push({
            id: args[0],
            content: args[1],
            created_at: args[2],
            updated_at: args[3],
          });
        }
        // UPDATE user_stats (加算)
        if (q.includes("total_stocks + 1")) {
          userStats.total_stocks += 1;
          userStats.score += 10;
        }
        // UPDATE user_stats (減算)
        if (q.includes("total_stocks - 1") || q.includes("MAX(0, total_stocks - 1)")) {
          userStats.total_stocks = Math.max(0, userStats.total_stocks - 1);
        }
        // DELETE FROM stocks
        if (q.includes("DELETE FROM stocks")) {
          const id = args[0];
          const idx = stocks.findIndex((s) => s.id === id);
          if (idx !== -1) stocks.splice(idx, 1);
        }
      }
      return [];
    },
  } as unknown as D1Database;
}
