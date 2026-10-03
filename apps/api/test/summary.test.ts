import { describe, it, expect } from "vite-plus/test";
import { generateWeeklySummaryText } from "../src/services/summary-ai";
import type { Stock } from "../src/schemas/stock";

describe("Weekly AI Summary Service", () => {
  const mockStocks: Stock[] = [
    {
      id: "stock-1",
      content: "TypeScript の型定義を改善した。型安全性が高まって嬉しい。",
      tags: ["エンジニアリング", "学び"],
      ai_comment: null,
      image_keys: null,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "stock-2",
      content: "朝のランニングを再開。頭がすっきりして仕事に集中できた。",
      tags: ["健康"],
      ai_comment: null,
      image_keys: null,
      created_at: "2026-10-03T07:00:00.000Z",
      updated_at: "2026-10-03T07:00:00.000Z",
    },
  ];

  it("should return friendly message when no stocks exist", async () => {
    const env = { DB: {} as any };
    const result = await generateWeeklySummaryText(env, []);
    expect(result.summary).toContain("過去1週間のストックがまだ記録されていません");
    expect(result.keyThemes).toEqual([]);
  });

  it("should generate structured weekly summary using fallback when AI is unavailable", async () => {
    const env = { DB: {} as any };
    const result = await generateWeeklySummaryText(env, mockStocks);

    expect(result.summary).toContain("### 🎯 今週の注力テーマ");
    expect(result.summary).toContain("### ✨ 思考の軌跡と深まり");
    expect(result.summary).toContain("### 🔮 来週へ向けた問いかけ");
    expect(result.summary).toContain("合計 2 件のストック");
    expect(result.keyThemes.length).toBeGreaterThan(0);
  });
});
