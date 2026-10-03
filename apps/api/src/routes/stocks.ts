import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createStockSchema, type Stock } from "../schemas/stock";
import { calculateStreak, getJSTDateString } from "../utils/streak";
import { generateAndSaveAIComment } from "../services/ai";
import { listStocks, createStockWithStats, deleteStockWithStats } from "../db/stocks";
import { getUserStats, getStreakContext } from "../db/stats";

export type Bindings = {
  DB: D1Database;
  AI?: Ai;
};

export const stockRoutes = new Hono<{ Bindings: Bindings }>()
  // ストック一覧取得
  .get("/api/stocks", async (c) => {
    const stocks = await listStocks(c.env.DB);
    return c.json({ stocks });
  })

  // ストック新規作成
  .post("/api/stocks", zValidator("json", createStockSchema), async (c) => {
    const { content } = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const todayJST = getJSTDateString();

    // 現在のストリーク統計を取得して新しいストリークを計算
    const streakContext = await getStreakContext(c.env.DB);
    const streakResult = calculateStreak(
      streakContext.last_stock_date,
      streakContext.current_streak,
      streakContext.max_streak,
      todayJST,
    );

    // D1 にストック保存および統計をバッチ更新
    await createStockWithStats(c.env.DB, {
      id,
      content,
      now,
      newStreak: streakResult.newStreak,
      newMaxStreak: streakResult.newMaxStreak,
      todayJST,
    });

    const createdStock: Stock = {
      id,
      content,
      created_at: now,
      updated_at: now,
    };

    // 非同期で AI コメントを生成・保存 (waitUntil によるレイテンシゼロのバックグラウンド実行)
    const aiPromise = generateAndSaveAIComment(c.env, id, content);
    try {
      c.executionCtx.waitUntil(aiPromise);
    } catch {
      // テスト環境等で ExecutionContext が未提供の場合はバックグラウンド解決
      aiPromise.catch(() => {});
    }

    return c.json(createdStock, 201);
  })

  // ストック削除
  .delete("/api/stocks/:id", async (c) => {
    const id = c.req.param("id");
    await deleteStockWithStats(c.env.DB, id);
    return c.json({ success: true, id });
  })

  // ユーザー統計取得
  .get("/api/stats", async (c) => {
    const stats = await getUserStats(c.env.DB);
    return c.json(stats);
  });
