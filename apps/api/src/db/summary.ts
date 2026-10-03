import type { WeeklySummary, Stock } from "../schemas/stock";

interface WeeklySummaryRow {
  id: string;
  week_key: string;
  start_date: string;
  end_date: string;
  stock_count: number;
  summary: string;
  key_themes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 最新の週次サマリーを取得
 */
export async function getLatestWeeklySummary(db: D1Database): Promise<WeeklySummary | null> {
  const row = await db
    .prepare("SELECT * FROM weekly_summaries ORDER BY created_at DESC LIMIT 1")
    .first<WeeklySummaryRow>();

  if (!row) return null;

  let key_themes: string[] = [];
  if (row.key_themes) {
    try {
      key_themes = JSON.parse(row.key_themes);
    } catch {
      // ignore parse error
    }
  }

  return {
    ...row,
    key_themes,
  };
}

/**
 * 指定した週キーのサマリーを取得
 */
export async function getWeeklySummaryByWeekKey(
  db: D1Database,
  weekKey: string,
): Promise<WeeklySummary | null> {
  const row = await db
    .prepare("SELECT * FROM weekly_summaries WHERE week_key = ? LIMIT 1")
    .bind(weekKey)
    .first<WeeklySummaryRow>();

  if (!row) return null;

  let key_themes: string[] = [];
  if (row.key_themes) {
    try {
      key_themes = JSON.parse(row.key_themes);
    } catch {
      // ignore parse error
    }
  }

  return {
    ...row,
    key_themes,
  };
}

/**
 * 週次サマリーの保存 (INSERT or REPLACE)
 */
export async function saveWeeklySummary(
  db: D1Database,
  summary: {
    id: string;
    week_key: string;
    start_date: string;
    end_date: string;
    stock_count: number;
    summary: string;
    key_themes: string[];
    now: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO weekly_summaries 
       (id, week_key, start_date, end_date, stock_count, summary, key_themes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      summary.id,
      summary.week_key,
      summary.start_date,
      summary.end_date,
      summary.stock_count,
      summary.summary,
      JSON.stringify(summary.key_themes),
      summary.now,
      summary.now,
    )
    .run();
}

/**
 * 直近 N 日間のストックを取得 (最新順)
 */
export async function getRecentStocksForSummary(
  db: D1Database,
  startDateStr: string,
): Promise<Stock[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at, a.comment as ai_comment
       FROM stocks s
       LEFT JOIN ai_comments a ON s.id = a.stock_id
       WHERE date(s.created_at, '+9 hours') >= date(?)
       ORDER BY s.created_at ASC`,
    )
    .bind(startDateStr)
    .all<{
      id: string;
      content: string;
      image_keys: string | null;
      created_at: string;
      updated_at: string;
      ai_comment: string | null;
    }>();

  // タグ情報も取得
  const stocks: Stock[] = [];
  for (const row of results) {
    const { results: tagRows } = await db
      .prepare("SELECT name FROM tags WHERE stock_id = ?")
      .bind(row.id)
      .all<{ name: string }>();

    stocks.push({
      ...row,
      tags: tagRows.map((t) => t.name),
    });
  }

  return stocks;
}
