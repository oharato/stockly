import type { Stock } from "../schemas/stock";

/**
 * ストック一覧を取得（最新順、AIコメントを JOIN、オプションでキーワード検索）
 */
export async function listStocks(db: D1Database, query?: string): Promise<Stock[]> {
  const trimmed = query?.trim();

  if (trimmed) {
    const { results } = await db
      .prepare(
        `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at, a.comment AS ai_comment
         FROM stocks s
         LEFT JOIN ai_comments a ON s.id = a.stock_id
         WHERE s.content LIKE ?
         ORDER BY s.created_at DESC`,
      )
      .bind(`%${trimmed}%`)
      .all<Stock>();

    return results;
  }

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
  imageKeys?: string[] | null;
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
  const imageKeysJson =
    params.imageKeys && params.imageKeys.length > 0 ? JSON.stringify(params.imageKeys) : null;

  await db.batch([
    db
      .prepare(
        `INSERT INTO stocks (id, content, image_keys, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(params.id, params.content, imageKeysJson, params.now, params.now),
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

/**
 * 今日の再発見（過去のストックから1日1件固定で抽出）
 * @param todayJST 今日のJST日付 ('YYYY-MM-DD')
 */
export async function getDailyRediscoveryStock(
  db: D1Database,
  todayJST: string,
): Promise<Stock | null> {
  // 今日より前に作成された過去ストックを取得
  const { results } = await db
    .prepare(
      `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at, a.comment AS ai_comment
       FROM stocks s
       LEFT JOIN ai_comments a ON s.id = a.stock_id
       WHERE substr(s.created_at, 1, 10) < ?
       ORDER BY s.created_at ASC`,
    )
    .bind(todayJST)
    .all<Stock>();

  if (!results || results.length === 0) {
    // 過去データがない場合は、今日作成されたストックも含めて最古のストックをフォールバックとして返す
    const all = await listStocks(db);
    return all.length > 0 ? (all[all.length - 1] ?? null) : null;
  }

  // todayJST のハッシュ値を用いて決定論的に 1 件選択（同日内はリロードしても同じカード）
  let hash = 0;
  for (let i = 0; i < todayJST.length; i++) {
    hash = (hash * 31 + todayJST.charCodeAt(i)) >>> 0;
  }
  const index = hash % results.length;
  return results[index] ?? null;
}
