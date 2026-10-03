/**
 * ストリーク（連続記録日数）計算ユーティリティ
 */

export interface StreakResult {
  newStreak: number;
  newMaxStreak: number;
  isStreakIncremented: boolean;
}

/**
 * 最終記録日と現在日（YYYY-MM-DD）から新しいストリーク状態を計算する
 * @param lastStockDate 最終ストック記録日 (YYYY-MM-DD または null)
 * @param currentStreak 現在の連続日数
 * @param maxStreak 過去の最大連続日数
 * @param todayDate 今日の日付 (YYYY-MM-DD)
 */
export function calculateStreak(
  lastStockDate: string | null | undefined,
  currentStreak: number,
  maxStreak: number,
  todayDate: string,
): StreakResult {
  // 初回投稿の場合
  if (!lastStockDate) {
    const newStreak = 1;
    return {
      newStreak,
      newMaxStreak: Math.max(maxStreak, newStreak),
      isStreakIncremented: true,
    };
  }

  // 同日内の重複投稿の場合: ストリークは維持
  if (lastStockDate === todayDate) {
    return {
      newStreak: Math.max(1, currentStreak),
      newMaxStreak: Math.max(maxStreak, currentStreak),
      isStreakIncremented: false,
    };
  }

  // 日付の差分日数を計算
  const last = new Date(lastStockDate);
  const today = new Date(todayDate);
  const diffTime = today.getTime() - last.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // 1日差 (昨日投稿している場合): ストリーク +1
  if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    return {
      newStreak,
      newMaxStreak: Math.max(maxStreak, newStreak),
      isStreakIncremented: true,
    };
  }

  // 2日以上空いた場合: ストリークは1にリセット
  const newStreak = 1;
  return {
    newStreak,
    newMaxStreak: Math.max(maxStreak, newStreak),
    isStreakIncremented: true,
  };
}

/**
 * 指定された日時の JST 日付文字列 (YYYY-MM-DD) を取得する
 */
export function getJSTDateString(date: Date = new Date()): string {
  // JST は UTC+9
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(date.getTime() + jstOffset);
  return jstDate.toISOString().slice(0, 10);
}
