import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createStockSchema, Stock, UserStats } from "../schemas/stock";

export type Bindings = {
  DB: D1Database;
  AI?: Ai;
};

export const stockRoutes = new Hono<{ Bindings: Bindings }>()
  // ストック一覧取得
  .get("/api/stocks", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT s.id, s.content, s.image_keys, s.created_at, s.updated_at, a.comment AS ai_comment
       FROM stocks s
       LEFT JOIN ai_comments a ON s.id = a.stock_id
       ORDER BY s.created_at DESC`,
    ).all<Stock>();

    return c.json({ stocks: results });
  })

  // ストック新規作成
  .post("/api/stocks", zValidator("json", createStockSchema), async (c) => {
    const { content } = c.req.valid("json");
    const id = crypto.randomUUID();

    // トランザクション的にストック作成と統計更新を実行
    const now = new Date().toISOString();
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO stocks (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      ).bind(id, content, now, now),
      c.env.DB.prepare(
        `UPDATE user_stats
         SET total_stocks = total_stocks + 1,
             score = score + 10
         WHERE id = 'default'`,
      ),
    ]);

    const createdStock: Stock = {
      id,
      content,
      created_at: now,
      updated_at: now,
    };

    return c.json(createdStock, 201);
  })

  // ストック削除
  .delete("/api/stocks/:id", async (c) => {
    const id = c.req.param("id");

    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM stocks WHERE id = ?`).bind(id),
      c.env.DB.prepare(
        `UPDATE user_stats
         SET total_stocks = MAX(0, total_stocks - 1)
         WHERE id = 'default'`,
      ),
    ]);

    return c.json({ success: true, id });
  })

  // ユーザー統計取得
  .get("/api/stats", async (c) => {
    const stats = await c.env.DB.prepare(
      `SELECT score, total_stocks, rediscovery_count, current_streak, max_streak, last_stock_date
       FROM user_stats WHERE id = 'default'`,
    ).first<UserStats>();

    return c.json(
      stats ?? {
        score: 0,
        total_stocks: 0,
        rediscovery_count: 0,
        current_streak: 0,
        max_streak: 0,
        last_stock_date: null,
      },
    );
  });
