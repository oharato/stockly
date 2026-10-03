import { describe, expect, it } from "vite-plus/test";
import { createStockSchema, userStatsSchema, stockSchema } from "../../src/schemas/stock";

describe("Stock Zod Schemas (Unit Tests)", () => {
  describe("createStockSchema", () => {
    it("should accept valid stock content", () => {
      const result = createStockSchema.safeParse({
        content: "今日学んだこと: Svelte 5 の Runes は非常に使いやすい。",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("今日学んだこと: Svelte 5 の Runes は非常に使いやすい。");
      }
    });

    it("should reject empty content", () => {
      const result = createStockSchema.safeParse({ content: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("本文を入力してください");
      }
    });

    it("should reject content with more than 2000 characters", () => {
      const longText = "あ".repeat(2001);
      const result = createStockSchema.safeParse({ content: longText });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("2000文字以内で入力してください");
      }
    });

    it("should accept content with up to 2000 characters", () => {
      const exactText = "あ".repeat(2000);
      const result = createStockSchema.safeParse({ content: exactText });
      expect(result.success).toBe(true);
    });

    it("should accept optional tagNames", () => {
      const result = createStockSchema.safeParse({
        content: "タグ付きストック",
        tagNames: ["svelte", "typescript"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tagNames).toEqual(["svelte", "typescript"]);
      }
    });
  });

  describe("stockSchema", () => {
    it("should validate a complete stock object", () => {
      const result = stockSchema.safeParse({
        id: "stock-123",
        content: "メモ内容",
        image_keys: null,
        created_at: "2026-10-03T12:00:00Z",
        updated_at: "2026-10-03T12:00:00Z",
        ai_comment: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("userStatsSchema", () => {
    it("should validate complete stats object", () => {
      const result = userStatsSchema.safeParse({
        score: 100,
        total_stocks: 10,
        rediscovery_count: 2,
        current_streak: 5,
        max_streak: 7,
        last_stock_date: "2026-10-03",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(100);
        expect(result.data.total_stocks).toBe(10);
      }
    });
  });
});
