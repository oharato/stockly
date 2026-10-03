import type { UserStats } from "../schemas/stock";

/**
 * ユーザー統計情報を取得（存在しない場合はデフォルト値を返す）
 */
export async function getUserStats(db: D1Database): Promise<UserStats> {
  const stats = await db
    .prepare(
      `SELECT score, total_stocks, rediscovery_count, current_streak, max_streak, last_stock_date
       FROM user_stats WHERE id = 'default'`,
    )
    .first<UserStats>();

  return (
    stats ?? {
      score: 0,
      total_stocks: 0,
      rediscovery_count: 0,
      current_streak: 0,
      max_streak: 0,
      last_stock_date: null,
    }
  );
}

/**
 * ストリーク計算に必要な情報のみを軽量に取得
 */
export async function getStreakContext(db: D1Database): Promise<{
  current_streak: number;
  max_streak: number;
  last_stock_date: string | null;
}> {
  const stats = await db
    .prepare(
      `SELECT current_streak, max_streak, last_stock_date FROM user_stats WHERE id = 'default'`,
    )
    .first<{ current_streak: number; max_streak: number; last_stock_date: string | null }>();

  return {
    current_streak: stats?.current_streak ?? 0,
    max_streak: stats?.max_streak ?? 0,
    last_stock_date: stats?.last_stock_date ?? null,
  };
}

/**
 * 再発見を記録し、カウントとスコアを加算 (+1件, +20pt)
 */
export async function incrementRediscoveryCount(db: D1Database): Promise<UserStats> {
  await db
    .prepare(
      `UPDATE user_stats
       SET rediscovery_count = rediscovery_count + 1,
           score = score + 20
       WHERE id = 'default'`,
    )
    .run();

  return getUserStats(db);
}
