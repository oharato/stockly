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

    // DB からストック一覧を取得し、ai_comment が紐付いていることを確認
    const { results } = await mockDB.prepare("SELECT * FROM stocks").all();
    const createdStock = results.find((s: any) => s.id === stockId);
    expect(createdStock?.ai_comment).toBe(comment);
  });

  it("should use Workers AI when binding is present", async () => {
    const mockDB = createMockDB();
    const stockId = "stock-ai-test-2";
    const content = "失敗を恐れずに行動することが大切だと気づいた。";

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
  });
});
