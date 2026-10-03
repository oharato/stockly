import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createStockSchema, createGoalSchema, type Stock, type Goal } from "../schemas/stock";
import { calculateStreak, getJSTDateString } from "../utils/streak";
import { generateAndSaveAIComment } from "../services/ai";
import {
  listStocks,
  createStockWithStats,
  deleteStockWithStats,
  getDailyRediscoveryStock,
} from "../db/stocks";
import { getUserStats, getStreakContext, incrementRediscoveryCount } from "../db/stats";
import { listGoals, createGoal, deleteGoal, listTags } from "../db/goals";

export type Bindings = {
  DB: D1Database;
  AI?: Ai;
  STORAGE?: R2Bucket;
};

export const stockRoutes = new Hono<{ Bindings: Bindings }>()
  // 画像アップロード (Cloudflare R2)
  .post("/api/upload", async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "画像ファイルが指定されていません" }, 400);
    }

    // 5MB 制限
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "ファイルサイズは5MB以内にしてください" }, 400);
    }

    // MIME タイプ検証
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "対応していない画像形式です (JPEG, PNG, WebP, GIF のみ)" }, 400);
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `img-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    if (c.env.STORAGE) {
      const buffer = await file.arrayBuffer();
      await c.env.STORAGE.put(key, buffer, {
        httpMetadata: { contentType: file.type },
      });
    }

    return c.json(
      {
        key,
        url: `/api/media/${key}`,
      },
      201,
    );
  })

  // 画像配信 (Cloudflare R2)
  .get("/api/media/:key", async (c) => {
    const key = c.req.param("key");
    if (!c.env.STORAGE) {
      return c.text("Storage not configured", 404);
    }

    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.text("Media not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  })

  // ストック一覧取得（キーワード検索 & タグフィルター対応）
  .get("/api/stocks", async (c) => {
    const query = c.req.query("q");
    const tag = c.req.query("tag");
    const stocks = await listStocks(c.env.DB, query, tag);
    return c.json({ stocks });
  })

  // 今日の再発見取得（1日1件固定）
  .get("/api/stocks/rediscovery", async (c) => {
    const todayJST = getJSTDateString();
    const rediscovery = await getDailyRediscoveryStock(c.env.DB, todayJST);
    return c.json({ rediscovery });
  })

  // 再発見の読了記録 (+1件, +20pt)
  .post("/api/stocks/rediscovery/read", async (c) => {
    const stats = await incrementRediscoveryCount(c.env.DB);
    return c.json({ success: true, stats });
  })

  // 使用中のタグ一覧取得
  .get("/api/tags", async (c) => {
    const tags = await listTags(c.env.DB);
    return c.json({ tags });
  })

  // 目標一覧取得
  .get("/api/goals", async (c) => {
    const goals = await listGoals(c.env.DB);
    return c.json({ goals });
  })

  // 目標新規作成
  .post("/api/goals", zValidator("json", createGoalSchema), async (c) => {
    const { title, category, color } = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await createGoal(c.env.DB, {
      id,
      title: title.trim(),
      category: category || "general",
      color: color || "teal",
      now,
    });
    const createdGoal: Goal = {
      id,
      title: title.trim(),
      category: category || "general",
      color: color || "teal",
      is_archived: 0,
      stock_count: 0,
      created_at: now,
      updated_at: now,
    };
    return c.json(createdGoal, 201);
  })

  // 目標削除
  .delete("/api/goals/:id", async (c) => {
    const id = c.req.param("id");
    await deleteGoal(c.env.DB, id);
    return c.json({ success: true, id });
  })

  // ストック新規作成
  .post("/api/stocks", zValidator("json", createStockSchema), async (c) => {
    const { content, imageKeys, tagNames } = c.req.valid("json");
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
      imageKeys,
      tagNames,
      now,
      newStreak: streakResult.newStreak,
      newMaxStreak: streakResult.newMaxStreak,
      todayJST,
    });

    const createdStock: Stock = {
      id,
      content,
      image_keys: imageKeys && imageKeys.length > 0 ? JSON.stringify(imageKeys) : null,
      tags: tagNames && tagNames.length > 0 ? tagNames.map((t: string) => t.trim()) : [],
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
