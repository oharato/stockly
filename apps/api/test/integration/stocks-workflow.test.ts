import { describe, expect, it } from "vite-plus/test";
import app from "../../src/index";
import { createMockDB } from "../helpers/mock-db";

describe("Stocks Full Integration Workflow", () => {
  it("should handle the complete user reflection lifecycle", async () => {
    const mockDB = createMockDB();

    // 1. 初期状態の確認 (ストック 0件、スコア 0pt)
    const initialListRes = await app.request("/api/stocks", {}, { DB: mockDB });
    const initialListData = (await initialListRes.json()) as any;
    expect(initialListData.stocks).toEqual([]);

    const initialStatsRes = await app.request("/api/stats", {}, { DB: mockDB });
    const initialStats = (await initialStatsRes.json()) as any;
    expect(initialStats.total_stocks).toBe(0);
    expect(initialStats.score).toBe(0);

    // 2. 1つ目の内省メモを投稿 (YWT形式)
    const ywtContent =
      "【YWT】やったこと: API結合テスト作成\nわかったこと: テストトロフィー戦略の有効性\n次やること: E2Eテスト作成";
    const postRes1 = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: ywtContent }),
      },
      { DB: mockDB },
    );
    expect(postRes1.status).toBe(201);
    const created1 = (await postRes1.json()) as any;
    expect(created1.content).toBe(ywtContent);

    // 3. 2つ目の内省メモを投稿
    const postRes2 = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "2つ目の気づき: TypeScript型安全性の重要さ" }),
      },
      { DB: mockDB },
    );
    expect(postRes2.status).toBe(201);
    const created2 = (await postRes2.json()) as any;

    // 4. 一覧取得の確認 (新しい順 = created2 が先頭に来ること)
    const listRes = await app.request("/api/stocks", {}, { DB: mockDB });
    const listData = (await listRes.json()) as any;
    expect(listData.stocks).toHaveLength(2);
    expect(listData.stocks[0].id).toBe(created2.id);
    expect(listData.stocks[1].id).toBe(created1.id);

    // 5. 統計の確認 (2件、スコア 20pt)
    const statsRes = await app.request("/api/stats", {}, { DB: mockDB });
    const stats = (await statsRes.json()) as any;
    expect(stats.total_stocks).toBe(2);
    expect(stats.score).toBe(20);

    // 6. 不正な入力（空文字）の拒否確認 (400 Bad Request、データ増加なし)
    const invalidPostRes = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      },
      { DB: mockDB },
    );
    expect(invalidPostRes.status).toBe(400);

    // 7. 1つ目のストックを削除
    const deleteRes = await app.request(
      `/api/stocks/${created1.id}`,
      { method: "DELETE" },
      { DB: mockDB },
    );
    expect(deleteRes.status).toBe(200);

    // 8. 削除後の整合性確認 (残件数 1件、統計 total_stocks が 1 に減算)
    const afterDeleteListRes = await app.request("/api/stocks", {}, { DB: mockDB });
    const afterDeleteListData = (await afterDeleteListRes.json()) as any;
    expect(afterDeleteListData.stocks).toHaveLength(1);
    expect(afterDeleteListData.stocks[0].id).toBe(created2.id);

    const afterDeleteStatsRes = await app.request("/api/stats", {}, { DB: mockDB });
    const afterDeleteStats = (await afterDeleteStatsRes.json()) as any;
    expect(afterDeleteStats.total_stocks).toBe(1);
  });
});
