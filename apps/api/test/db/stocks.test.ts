import { describe, expect, it } from "vite-plus/test";
import { listStocks, createStockWithStats, deleteStockWithStats } from "../../src/db/stocks";
import { getUserStats, getStreakContext } from "../../src/db/stats";
import { insertAIComment } from "../../src/db/ai-comments";
import { createMockDB } from "../helpers/mock-db";

describe("D1 Data Access Functions (src/db)", () => {
  it("should handle stocks, stats and ai-comments operations correctly", async () => {
    const mockDB = createMockDB();

    // 1. 初期統計確認
    const initialStats = await getUserStats(mockDB);
    expect(initialStats.total_stocks).toBe(0);
    expect(initialStats.score).toBe(0);

    const initialStreak = await getStreakContext(mockDB);
    expect(initialStreak.current_streak).toBe(0);

    // 2. ストック作成 & 統計更新
    const stockId = "db-test-stock-1";
    const now = "2026-10-03T12:00:00.000Z";
    await createStockWithStats(mockDB, {
      id: stockId,
      content: "DB層切り出しテスト",
      now,
      newStreak: 1,
      newMaxStreak: 1,
      todayJST: "2026-10-03",
    });

    // 3. AIコメント挿入
    await insertAIComment(mockDB, {
      id: "ai-comment-1",
      stockId,
      comment: "DB層への責務分離が綺麗ですね！",
      createdAt: now,
    });

    // 4. 一覧取得（AIコメントがJOINされていること）
    const stocks = await listStocks(mockDB);
    expect(stocks).toHaveLength(1);
    expect(stocks[0]?.id).toBe(stockId);
    expect(stocks[0]?.content).toBe("DB層切り出しテスト");
    expect(stocks[0]?.ai_comment).toBe("DB層への責務分離が綺麗ですね！");

    // 5. 統計の更新確認
    const updatedStats = await getUserStats(mockDB);
    expect(updatedStats.total_stocks).toBe(1);
    expect(updatedStats.score).toBe(10);
    expect(updatedStats.current_streak).toBe(1);

    // 6. ストック削除
    await deleteStockWithStats(mockDB, stockId);
    const afterDeleteStocks = await listStocks(mockDB);
    expect(afterDeleteStocks).toHaveLength(0);

    const afterDeleteStats = await getUserStats(mockDB);
    expect(afterDeleteStats.total_stocks).toBe(0);
  });
});
