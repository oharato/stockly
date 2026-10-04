import type { Stock } from "../schemas/stock";

/**
 * ストック一覧を取得（最新順、AIコメントおよびタグを JOIN、オプションでキーワード検索 & タグフィルター & ユーザー分離）
 */
export async function listStocks(
  db: D1Database,
  query?: string,
  tag?: string,
  userId: string = "default",
): Promise<Stock[]> {
  const trimmedQuery = query?.trim();
  const trimmedTag = tag?.trim();

  let sql = `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at,
                    a.comment AS ai_comment,
                    GROUP_CONCAT(DISTINCT t.name) AS tag_names
             FROM stocks s
             LEFT JOIN ai_comments a ON s.id = a.stock_id
             LEFT JOIN tags t ON s.id = t.stock_id`;

  const whereClauses: string[] = ["s.user_id = ?"];
  const bindings: unknown[] = [userId];

  if (trimmedQuery) {
    whereClauses.push("s.content LIKE ?");
    bindings.push(`%${trimmedQuery}%`);
  }

  if (trimmedTag) {
    whereClauses.push("s.id IN (SELECT stock_id FROM tags WHERE name = ?)");
    bindings.push(trimmedTag);
  }

  sql += ` WHERE ${whereClauses.join(" AND ")}`;
  sql += ` GROUP BY s.id ORDER BY s.created_at DESC`;

  const stmt = db.prepare(sql);
  const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
  const { results } = await bound.all<{
    id: string;
    content: string;
    image_keys: string | null;
    tag_names: string | null;
    created_at: string;
    updated_at: string;
    ai_comment: string | null;
  }>();

  return results.map((row) => ({
    id: row.id,
    content: row.content,
    image_keys: row.image_keys,
    tags: row.tag_names ? row.tag_names.split(",") : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    ai_comment: row.ai_comment,
  }));
}

export interface CreateStockWithStatsParams {
  id: string;
  userId?: string;
  content: string;
  imageKeys?: string[] | null;
  tagNames?: string[] | null;
  now: string;
  newStreak: number;
  newMaxStreak: number;
  todayJST: string;
}

/**
 * ストック作成とユーザー統計の更新（スコア+10pt, ストリーク更新、タグ保存）をバッチ実行
 */
export async function createStockWithStats(
  db: D1Database,
  params: CreateStockWithStatsParams,
): Promise<void> {
  const userId = params.userId || "default";
  const imageKeysJson =
    params.imageKeys && params.imageKeys.length > 0 ? JSON.stringify(params.imageKeys) : null;

  const batchStmts = [
    db
      .prepare(
        `INSERT INTO stocks (id, user_id, content, image_keys, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(params.id, userId, params.content, imageKeysJson, params.now, params.now),
    db
      .prepare(
        `UPDATE user_stats
         SET total_stocks = total_stocks + 1,
             score = score + 10,
             current_streak = ?,
             max_streak = ?,
             last_stock_date = ?
         WHERE id = ?`,
      )
      .bind(params.newStreak, params.newMaxStreak, params.todayJST, userId),
  ];

  if (params.tagNames && params.tagNames.length > 0) {
    for (const name of params.tagNames) {
      const cleanName = name.trim();
      if (cleanName) {
        batchStmts.push(
          db
            .prepare(`INSERT INTO tags (id, stock_id, name) VALUES (?, ?, ?)`)
            .bind(crypto.randomUUID(), params.id, cleanName),
        );
      }
    }
  }

  await db.batch(batchStmts);
}

/**
 * ストック削除とユーザー統計の更新（total_stocks - 1、タグ削除）をバッチ実行
 */
export async function deleteStockWithStats(
  db: D1Database,
  id: string,
  userId: string = "default",
): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM tags WHERE stock_id = ?`).bind(id),
    db.prepare(`DELETE FROM ai_comments WHERE stock_id = ?`).bind(id),
    db.prepare(`DELETE FROM stocks WHERE id = ? AND user_id = ?`).bind(id, userId),
    db
      .prepare(
        `UPDATE user_stats
       SET total_stocks = MAX(0, total_stocks - 1)
       WHERE id = ?`,
      )
      .bind(userId),
  ]);
}

/**
 * 今日の再発見（過去のストックから1日1件固定で抽出）
 * @param todayJST 今日のJST日付 ('YYYY-MM-DD')
 * @param userId ユーザーID
 */
export async function getDailyRediscoveryStock(
  db: D1Database,
  todayJST: string,
  userId: string = "default",
): Promise<Stock | null> {
  // 今日より前に作成された過去ストックを取得
  const { results } = await db
    .prepare(
      `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at,
              a.comment AS ai_comment,
              GROUP_CONCAT(DISTINCT t.name) AS tag_names
       FROM stocks s
       LEFT JOIN ai_comments a ON s.id = a.stock_id
       LEFT JOIN tags t ON s.id = t.stock_id
       WHERE s.user_id = ? AND substr(s.created_at, 1, 10) < ?
       GROUP BY s.id
       ORDER BY s.created_at ASC`,
    )
    .bind(userId, todayJST)
    .all<{
      id: string;
      content: string;
      image_keys: string | null;
      tag_names: string | null;
      created_at: string;
      updated_at: string;
      ai_comment: string | null;
    }>();

  if (!results || results.length === 0) {
    // 過去データがない場合は、今日作成されたストックも含めて最古のストックをフォールバックとして返す
    const all = await listStocks(db, undefined, undefined, userId);
    return all.length > 0 ? (all[all.length - 1] ?? null) : null;
  }

  // todayJST のハッシュ値を用いて決定論的に 1 件選択（同日内はリロードしても同じカード）
  let hash = 0;
  for (let i = 0; i < todayJST.length; i++) {
    hash = (hash * 31 + todayJST.charCodeAt(i)) >>> 0;
  }
  const index = hash % results.length;
  const picked = results[index];
  if (!picked) return null;

  return {
    id: picked.id,
    content: picked.content,
    image_keys: picked.image_keys,
    tags: picked.tag_names ? picked.tag_names.split(",") : [],
    created_at: picked.created_at,
    updated_at: picked.updated_at,
    ai_comment: picked.ai_comment,
  };
}
