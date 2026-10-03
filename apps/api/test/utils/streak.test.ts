import { describe, expect, it } from "vite-plus/test";
import { calculateStreak, getJSTDateString } from "../../src/utils/streak";

describe("Streak Calculation (Unit Tests)", () => {
  it("should initialize streak to 1 on first stock", () => {
    const result = calculateStreak(null, 0, 0, "2026-10-03");
    expect(result.newStreak).toBe(1);
    expect(result.newMaxStreak).toBe(1);
    expect(result.isStreakIncremented).toBe(true);
  });

  it("should maintain streak when posting multiple times on the same day", () => {
    const result = calculateStreak("2026-10-03", 5, 10, "2026-10-03");
    expect(result.newStreak).toBe(5);
    expect(result.newMaxStreak).toBe(10);
    expect(result.isStreakIncremented).toBe(false);
  });

  it("should increment streak when posting on the consecutive day", () => {
    const result = calculateStreak("2026-10-02", 4, 4, "2026-10-03");
    expect(result.newStreak).toBe(5);
    expect(result.newMaxStreak).toBe(5);
    expect(result.isStreakIncremented).toBe(true);
  });

  it("should update maxStreak when current streak exceeds previous max", () => {
    const result = calculateStreak("2026-10-02", 10, 10, "2026-10-03");
    expect(result.newStreak).toBe(11);
    expect(result.newMaxStreak).toBe(11);
  });

  it("should reset streak to 1 when gap is 2 or more days", () => {
    const result = calculateStreak("2026-09-30", 7, 10, "2026-10-03");
    expect(result.newStreak).toBe(1);
    // maxStreak は過去最高値を保持
    expect(result.newMaxStreak).toBe(10);
    expect(result.isStreakIncremented).toBe(true);
  });

  describe("getJSTDateString", () => {
    it("should correctly convert UTC date to JST date (UTC+9)", () => {
      // UTC 2026-10-03 16:00:00 = JST 2026-10-04 01:00:00 (翌日)
      const utcNight = new Date("2026-10-03T16:00:00.000Z");
      expect(getJSTDateString(utcNight)).toBe("2026-10-04");

      // UTC 2026-10-03 03:00:00 = JST 2026-10-03 12:00:00 (同日)
      const utcDay = new Date("2026-10-03T03:00:00.000Z");
      expect(getJSTDateString(utcDay)).toBe("2026-10-03");
    });
  });
});
