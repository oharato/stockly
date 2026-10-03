/**
 * テスト用インメモリ D1 モックデータベース
 */
export function createMockDB() {
  const stocks: any[] = [];
  const aiComments: Record<string, string> = {};
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
                let filtered = [...stocks];
                if (query.includes("WHERE s.content LIKE ?") && args[0]) {
                  const pattern = String(args[0]).replace(/%/g, "").toLowerCase();
                  filtered = filtered.filter((s) =>
                    String(s.content).toLowerCase().includes(pattern),
                  );
                }
                if (query.includes("substr(s.created_at, 1, 10) < ?") && args[0]) {
                  const targetDate = String(args[0]);
                  filtered = filtered.filter((s) => s.created_at.slice(0, 10) < targetDate);
                }
                const results = filtered.reverse().map((s) => ({
                  ...s,
                  ai_comment: aiComments[s.id] || null,
                }));
                return { results };
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
                delete aiComments[id];
                return { success: true };
              }
              if (query.includes("INSERT INTO ai_comments")) {
                const stockId = args[1];
                const comment = args[2];
                aiComments[stockId] = comment;
                return { success: true };
              }
              if (query.includes("rediscovery_count = rediscovery_count + 1")) {
                userStats.rediscovery_count += 1;
                userStats.score += 20;
                return { success: true };
              }
              return { success: true };
            },
          };
        },
        async all() {
          if (query.includes("FROM stocks")) {
            const results = [...stocks].reverse().map((s) => ({
              ...s,
              ai_comment: aiComments[s.id] || null,
            }));
            return { results };
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
          if (query.includes("rediscovery_count = rediscovery_count + 1")) {
            userStats.rediscovery_count += 1;
            userStats.score += 20;
            return { success: true };
          }
          return { success: true };
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        const q = stmt.query || stmt._query || "";
        const args = stmt.args || stmt._args || [];

        // INSERT INTO stocks
        if (q.includes("INSERT INTO stocks")) {
          if (args.length >= 5) {
            stocks.push({
              id: args[0],
              content: args[1],
              image_keys: args[2],
              created_at: args[3],
              updated_at: args[4],
            });
          } else {
            stocks.push({
              id: args[0],
              content: args[1],
              image_keys: null,
              created_at: args[2],
              updated_at: args[3],
            });
          }
        }
        // UPDATE user_stats (加算)
        if (q.includes("total_stocks + 1")) {
          userStats.total_stocks += 1;
          userStats.score += 10;
          if (args.length >= 3) {
            userStats.current_streak = args[0];
            userStats.max_streak = args[1];
            userStats.last_stock_date = args[2];
          }
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
