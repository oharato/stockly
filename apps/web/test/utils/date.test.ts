import { describe, expect, it } from "vite-plus/test";
import { getDateKey, formatGroupTitle, formatTime } from "../../src/utils/date";

describe("Date Utilities (Unit Tests)", () => {
  describe("getDateKey", () => {
    it("should format valid ISO date to YYYY-MM-DD", () => {
      // JST (UTC+9) でも同一日付になる昼の時刻を使用
      expect(getDateKey("2026-10-03T03:30:00.000Z")).toBe("2026-10-03");
      expect(getDateKey("2026-01-05T03:00:00.000Z")).toBe("2026-01-05");
    });

    it("should return 'その他' for invalid date strings", () => {
      expect(getDateKey("invalid-date")).toBe("その他");
      expect(getDateKey("")).toBe("その他");
    });
  });

  describe("formatGroupTitle", () => {
    const fixedNow = new Date(2026, 9, 3, 12, 0, 0); // 2026-10-03 (土)

    it("should format today with '今日 - ' prefix", () => {
      const title = formatGroupTitle("2026-10-03", fixedNow);
      expect(title).toContain("今日 - ");
      expect(title).toContain("10月3日 (土)");
    });

    it("should format yesterday with '昨日 - ' prefix", () => {
      const title = formatGroupTitle("2026-10-02", fixedNow);
      expect(title).toContain("昨日 - ");
      expect(title).toContain("10月2日 (金)");
    });

    it("should format past date without prefix", () => {
      const title = formatGroupTitle("2026-09-28", fixedNow);
      expect(title).toBe("9月28日 (月)");
    });

    it("should pass through 'その他' or invalid keys", () => {
      expect(formatGroupTitle("その他", fixedNow)).toBe("その他");
      expect(formatGroupTitle("invalid", fixedNow)).toBe("invalid");
    });
  });

  describe("formatTime", () => {
    it("should format time to HH:MM", () => {
      // ローカルタイムで検証（フォーマットが空文字でないこと）
      const formatted = formatTime("2026-10-03T14:30:00.000Z");
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should return empty string for invalid date", () => {
      expect(formatTime("invalid")).toBe("");
    });
  });
});
