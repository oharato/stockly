/**
 * テスト用インメモリ D1 モックデータベース
 */
export function createMockDB() {
  const stocks: any[] = [];
  const aiComments: Record<string, string> = {};
  const tags: { id: string; stock_id: string; name: string }[] = [];
  const goals: any[] = [];
  const userStats = {
    id: "default",
    score: 0,
    total_stocks: 0,
    rediscovery_count: 0,
    current_streak: 0,
    max_streak: 0,
    last_stock_date: null,
    last_rediscovery_date: null as string | null,
  };

  function getStocksWithDetails(list: any[]) {
    return list.map((s) => ({
      ...s,
      tags: tags.filter((t) => t.stock_id === s.id).map((t) => t.name),
      ai_comment: aiComments[s.id] || null,
    }));
  }

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
                if (query.includes("s.content LIKE ?") && args.length > 0) {
                  const pattern = String(args[0]).replace(/%/g, "").toLowerCase();
                  filtered = filtered.filter((s) =>
                    String(s.content).toLowerCase().includes(pattern),
                  );
                }
                if (query.includes("SELECT stock_id FROM tags WHERE name = ?")) {
                  const targetTag = String(args[args.length - 1]);
                  const validStockIds = tags
                    .filter((t) => t.name === targetTag)
                    .map((t) => t.stock_id);
                  filtered = filtered.filter((s) => validStockIds.includes(s.id));
                }
                if (query.includes("substr(s.created_at, 1, 10) < ?") && args[0]) {
                  const targetDate = String(args[0]);
                  filtered = filtered.filter((s) => s.created_at.slice(0, 10) < targetDate);
                }
                const results = getStocksWithDetails([...filtered].reverse());
                return { results };
              }
              if (query.includes("FROM goals")) {
                const results = goals.map((g) => ({
                  ...g,
                  stock_count: tags.filter((t) => t.name === g.title).length,
                }));
                return { results };
              }
              if (query.includes("FROM tags")) {
                const countMap = new Map<string, number>();
                for (const t of tags) {
                  countMap.set(t.name, (countMap.get(t.name) || 0) + 1);
                }
                const results = Array.from(countMap.entries()).map(([name, count]) => ({
                  name,
                  count,
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
                const remainingTags = tags.filter((t) => t.stock_id !== id);
                tags.length = 0;
                tags.push(...remainingTags);
                return { success: true };
              }
              if (query.includes("INSERT INTO ai_comments")) {
                const stockId = args[1];
                const comment = args[2];
                aiComments[stockId] = comment;
                return { success: true };
              }
              if (query.includes("INSERT INTO goals")) {
                goals.push({
                  id: args[0],
                  title: args[1],
                  category: args[2],
                  color: args[3],
                  is_archived: args[4] ?? 0,
                  created_at: args[5],
                  updated_at: args[6],
                });
                return { success: true };
              }
              if (query.includes("DELETE FROM goals")) {
                const id = args[0];
                const idx = goals.findIndex((g) => g.id === id);
                if (idx !== -1) goals.splice(idx, 1);
                return { success: true };
              }
              if (query.includes("rediscovery_count = rediscovery_count + 1")) {
                userStats.rediscovery_count += 1;
                userStats.score += 20;
                if (args && args.length > 0) {
                  userStats.last_rediscovery_date = String(args[0]);
                }
                return { success: true };
              }
              return { success: true };
            },
          };
        },
        async all() {
          if (query.includes("FROM stocks")) {
            const results = getStocksWithDetails([...stocks].reverse());
            return { results };
          }
          if (query.includes("FROM goals")) {
            const results = goals.map((g) => ({
              ...g,
              stock_count: tags.filter((t) => t.name === g.title).length,
            }));
            return { results };
          }
          if (query.includes("FROM tags")) {
            const countMap = new Map<string, number>();
            for (const t of tags) {
              countMap.set(t.name, (countMap.get(t.name) || 0) + 1);
            }
            const results = Array.from(countMap.entries()).map(([name, count]) => ({
              name,
              count,
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
        // INSERT INTO tags
        if (q.includes("INSERT INTO tags")) {
          tags.push({
            id: args[0],
            stock_id: args[1],
            name: args[2],
          });
        }
        // DELETE FROM tags WHERE stock_id = ?
        if (q.includes("DELETE FROM tags WHERE stock_id = ?")) {
          const stockId = args[0];
          const remaining = tags.filter((t) => t.stock_id !== stockId);
          tags.length = 0;
          tags.push(...remaining);
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
