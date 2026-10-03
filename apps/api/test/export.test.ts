import { describe, it, expect } from "vite-plus/test";
import { formatAsMarkdown, formatAsCsv } from "../src/utils/export";
import type { Stock } from "../src/schemas/stock";

describe("Export Utilities", () => {
  const mockStocks: Stock[] = [
    {
      id: "stock-1",
      content: "朝の散歩でリフレッシュ。\n新しいアイデアが浮かんだ。",
      tags: ["健康", "アイデア"],
      ai_comment: "そのアイデアを具体化する最初の一歩は何ですか？",
      image_keys: '["img-1.jpg"]',
      created_at: "2026-10-04T00:30:00.000Z",
      updated_at: "2026-10-04T00:30:00.000Z",
    },
    {
      id: "stock-2",
      content: 'カンマを含む, "引用符" を含むテスト。',
      tags: [],
      ai_comment: null,
      image_keys: null,
      created_at: "2026-10-04T02:00:00.000Z",
      updated_at: "2026-10-04T02:00:00.000Z",
    },
  ];

  it("should format stocks as markdown correctly", () => {
    const md = formatAsMarkdown(mockStocks, "2026-10-04");
    expect(md).toContain("# Stockly エクスポート (2026-10-04)");
    expect(md).toContain("累計ストック件数: 2件");
    expect(md).toContain("**タグ**: #健康 #アイデア");
    expect(md).toContain("朝の散歩でリフレッシュ。");
    expect(md).toContain(
      "> 💡 **AIからの問いかけ**: そのアイデアを具体化する最初の一歩は何ですか？",
    );
    expect(md).toContain('カンマを含む, "引用符" を含むテスト。');
  });

  it("should format stocks as RFC 4180 CSV correctly", () => {
    const csv = formatAsCsv(mockStocks);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("id,created_at,content,tags,ai_comment,image_keys");
    expect(lines.length).toBe(3);

    // 1行目の検証
    expect(lines[1]).toContain('"stock-1"');
    expect(lines[1]).toContain('"健康;アイデア"');
    expect(lines[1]).toContain('"そのアイデアを具体化する最初の一歩は何ですか？"');

    // 2行目のエスケープ検証（カンマやダブルクォート）
    expect(lines[2]).toContain('"stock-2"');
    expect(lines[2]).toContain('""引用符""');
  });
});
