import { describe, expect, it } from "vite-plus/test";
import { generateAndSaveAIComment } from "../../src/services/ai";
import { createMockDB } from "../helpers/mock-db";

describe("AI Comment Service (Integration Tests)", () => {
  it("should generate a fallback comment and save to DB when AI binding is not present", async () => {
    const mockDB = createMockDB();
    const stockId = "stock-ai-test-1";
    const content = "今日は新しいツール Vite+ を導入して開発速度が上がった。";

    // ストックをDBに作成
    await mockDB.batch([
      mockDB
        .prepare("INSERT INTO stocks (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .bind(stockId, content, "2026-10-03", "2026-10-03"),
    ]);

    const comment = await generateAndSaveAIComment({ DB: mockDB }, stockId, content);

    expect(comment).toBeDefined();
    expect(typeof comment).toBe("string");
    expect(comment.length).toBeGreaterThan(10);

    // DB からストックと AI コメントの紐付けを確認
    const commentRow = await mockDB
      .prepare("SELECT comment FROM ai_comments WHERE stock_id = ?")
      .bind(stockId)
      .first<{ comment: string }>();
    expect(commentRow?.comment).toBe(comment);
  });

  it("should use Workers AI when binding is present", async () => {
    const mockDB = createMockDB();
    const stockId = "stock-ai-test-2";
    const content = "失敗を恐れずに行動することが大切だと気づいた。";

    // 外部キー制約を満たすため親ストックを作成
    await mockDB
      .prepare("INSERT INTO stocks (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .bind(stockId, content, "2026-10-03", "2026-10-03")
      .run();

    // Workers AI のモック
    const mockAI = {
      async run(model: string, options: any) {
        expect(model).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
        expect(options.messages).toBeDefined();
        return {
          response: "その挑戦の姿勢が素晴らしいですね！具体的にどんな一歩を踏み出しますか？",
        };
      },
    } as unknown as Ai;

    const comment = await generateAndSaveAIComment({ DB: mockDB, AI: mockAI }, stockId, content);

    expect(comment).toBe("その挑戦の姿勢が素晴らしいですね！具体的にどんな一歩を踏み出しますか？");

    const saved = await mockDB
      .prepare("SELECT comment FROM ai_comments WHERE stock_id = ?")
      .bind(stockId)
      .first<{ comment: string }>();
    expect(saved?.comment).toBe(comment);
  });
});
