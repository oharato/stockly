/**
 * AI コメントを ai_comments テーブルへ保存
 */
export async function insertAIComment(
  db: D1Database,
  params: {
    id: string;
    stockId: string;
    comment: string;
    createdAt: string;
  },
): Promise<void> {
  await db
    .prepare(`INSERT INTO ai_comments (id, stock_id, comment, created_at) VALUES (?, ?, ?, ?)`)
    .bind(params.id, params.stockId, params.comment, params.createdAt)
    .run();
}
