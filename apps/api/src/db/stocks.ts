import type { Stock } from "../schemas/stock";

/**
 * ストック一覧を取得（最新順、AIコメントを JOIN）
 */
export async function listStocks(db: D1Database): Promise<Stock[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at, a.comment AS ai_comment
       FROM stocks s
       LEFT JOIN ai_comments a ON s.id = a.stock_id
       ORDER BY s.created_at DESC`,
    )
    .all<Stock>();

  return results;
}

export interface CreateStockWithStatsParams {
  id: string;
  content: string;
  now: string;
  newStreak: number;
  newMaxStreak: number;
  todayJST: string;
}

/**
 * ストック作成とユーザー統計の更新（スコア+10pt, ストリーク更新）をバッチ実行
 */
export async function createStockWithStats(
  db: D1Database,
  params: CreateStockWithStatsParams,
): Promise<void> {
  await db.batch([
    db
      .prepare(`INSERT INTO stocks (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .bind(params.id, params.content, params.now, params.now),
    db
      .prepare(
        `UPDATE user_stats
         SET total_stocks = total_stocks + 1,
             score = score + 10,
             current_streak = ?,
             max_streak = ?,
             last_stock_date = ?
         WHERE id = 'default'`,
      )
      .bind(params.newStreak, params.newMaxStreak, params.todayJST),
  ]);
}

/**
 * ストック削除とユーザー統計の更新（total_stocks - 1）をバッチ実行
 */
export async function deleteStockWithStats(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM stocks WHERE id = ?`).bind(id),
    db.prepare(
      `UPDATE user_stats
       SET total_stocks = MAX(0, total_stocks - 1)
       WHERE id = 'default'`,
    ),
  ]);
}
