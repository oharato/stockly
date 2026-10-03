import { describe, it, expect } from "vite-plus/test";
import { parseCSV, parseJstDateToIso, generateMigrationSql } from "./import-csv";

describe("import-csv", () => {
  describe("parseCSV", () => {
    it("correctly parses simple CSV rows", () => {
      const csv =
        'テーマ,テキスト,作成日,更新日\n"仕事","メモ内容","2026/9/19 13:19:58","2026/9/19 13:19:58"';
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(["テーマ", "テキスト", "作成日", "更新日"]);
      expect(rows[1]).toEqual(["仕事", "メモ内容", "2026/9/19 13:19:58", "2026/9/19 13:19:58"]);
    });

    it("handles multiline text inside quotes", () => {
      const csv =
        'テーマ,テキスト,作成日,更新日\n"","1行目\n2行目\n3行目","2026/9/19 13:19:58","2026/9/19 13:19:58"';
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][1]).toBe("1行目\n2行目\n3行目");
    });

    it("handles escaped quotes inside quoted text", () => {
      const csv =
        'テーマ,テキスト,作成日,更新日\n"","「""引用""」です","2026/9/19 13:19:58","2026/9/19 13:19:58"';
      const rows = parseCSV(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][1]).toBe('「"引用"」です');
    });
  });

  describe("parseJstDateToIso", () => {
    it("converts JST date to UTC ISO string", () => {
      // 2026/9/19 13:19:58 JST = 2026-09-19 04:19:58 UTC
      const iso = parseJstDateToIso("2026/9/19 13:19:58");
      expect(iso).toBe("2026-09-19T04:19:58.000Z");
    });

    it("handles morning time crossing to previous day UTC", () => {
      // 2026/1/15 7:34:45 JST = 2026-01-14 22:34:45 UTC
      const iso = parseJstDateToIso("2026/1/15 7:34:45");
      expect(iso).toBe("2026-01-14T22:34:45.000Z");
    });

    it("throws on invalid date string", () => {
      expect(() => parseJstDateToIso("invalid-date-string")).toThrow();
    });
  });

  describe("generateMigrationSql", () => {
    it("generates atomic transaction with stocks and tags", () => {
      const records = [
        {
          theme: "技術",
          text: "TypeScriptの型システム",
          createdAt: "2026-09-19T04:19:58.000Z",
          updatedAt: "2026-09-19T04:19:58.000Z",
        },
        {
          theme: "",
          text: "単なるつぶやき",
          createdAt: "2026-09-18T04:19:58.000Z",
          updatedAt: "2026-09-18T04:19:58.000Z",
        },
      ];

      const sql = generateMigrationSql(records);
      expect(sql).toContain("INSERT INTO stocks");
      expect(sql).toContain("TypeScriptの型システム");
      expect(sql).toContain("INSERT INTO tags");
      expect(sql).toContain("技術");
      expect(sql).toContain(
        "UPDATE user_stats SET total_stocks = total_stocks + 2, score = score + 20",
      );
    });

    it("escapes single quotes safely", () => {
      const records = [
        {
          theme: "Quote's Theme",
          text: "It's working",
          createdAt: "2026-09-19T04:19:58.000Z",
          updatedAt: "2026-09-19T04:19:58.000Z",
        },
      ];

      const sql = generateMigrationSql(records);
      expect(sql).toContain("'It''s working'");
      expect(sql).toContain("'Quote''s Theme'");
    });
  });
});
