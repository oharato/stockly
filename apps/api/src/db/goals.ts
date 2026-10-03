import type { Goal, TagSummary } from "../schemas/stock";

/**
 * 目標一覧を取得（紐付くストック件数付き）
 */
export async function listGoals(db: D1Database): Promise<Goal[]> {
  const { results } = await db
    .prepare(
      `SELECT g.id, g.title, g.category, g.color, g.is_archived, g.created_at, g.updated_at,
              COUNT(t.id) AS stock_count
       FROM goals g
       LEFT JOIN tags t ON g.title = t.name
       GROUP BY g.id
       ORDER BY g.created_at ASC`,
    )
    .all<Goal>();

  return results;
}

export interface CreateGoalParams {
  id: string;
  title: string;
  category: string;
  color: string;
  now: string;
}

/**
 * 目標を新規作成
 */
export async function createGoal(db: D1Database, params: CreateGoalParams): Promise<void> {
  await db
    .prepare(
      `INSERT INTO goals (id, title, category, color, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
    )
    .bind(params.id, params.title, params.category, params.color, params.now, params.now)
    .run();
}

/**
 * 目標を削除
 */
export async function deleteGoal(db: D1Database, id: string): Promise<void> {
  await db.prepare(`DELETE FROM goals WHERE id = ?`).bind(id).run();
}

/**
 * 使用されているタグ一覧と件数を取得
 */
export async function listTags(db: D1Database): Promise<TagSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT name, COUNT(*) AS count
       FROM tags
       GROUP BY name
       ORDER BY count DESC, name ASC`,
    )
    .all<TagSummary>();

  return results;
}
