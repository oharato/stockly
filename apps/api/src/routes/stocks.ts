import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createStockSchema,
  createGoalSchema,
  type Stock,
  type Goal,
  type WeeklySummary,
} from "../schemas/stock";
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
import { formatAsMarkdown, formatAsCsv } from "../utils/export";
import {
  getLatestWeeklySummary,
  saveWeeklySummary,
  getRecentStocksForSummary,
} from "../db/summary";
import { generateWeeklySummaryText } from "../services/summary-ai";

export type Bindings = {
  DB: D1Database;
  AI?: Ai;
  STORAGE?: R2Bucket;
};

/**
 * リクエストヘッダーからユーザーコンテキストを取得
 * - E2Eテスト時は 'e2e-test' に切り替えてユーザー実データから完全隔離
 * - 通常アクセス時は常に 'default'
 */
function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const headerVal = c.req.header("X-Stockly-User-Id");
  if (headerVal && (headerVal === "e2e-test" || headerVal === "test")) {
    return headerVal;
  }
  return "default";
}

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
  .get(
    "/api/stocks",
    zValidator(
      "query",
      z.object({
        q: z.string().optional(),
        tag: z.string().optional(),
      }),
    ),
    async (c) => {
      const { q, tag } = c.req.valid("query");
      const userId = getUserId(c);
      try {
        const stocks = await listStocks(c.env.DB, q, tag, userId);
        return c.json({ stocks });
      } catch (err: unknown) {
        console.error("listStocks error:", err);
        return c.json(
          {
            stocks: [],
            error: "ストックの取得中にデータベースエラーが発生しました",
            details: err instanceof Error ? err.message : String(err),
          },
          500,
        );
      }
    },
  )

  // データエクスポート (JSON, Markdown, CSV)
  .get(
    "/api/export",
    zValidator(
      "query",
      z.object({
        format: z.enum(["json", "markdown", "csv"]).default("json"),
      }),
    ),
    async (c) => {
      const { format } = c.req.valid("query");
      const userId = getUserId(c);
      const todayJST = getJSTDateString();
      const stocks = await listStocks(c.env.DB, undefined, undefined, userId);

      if (format === "markdown") {
        const md = formatAsMarkdown(stocks, todayJST);
        return new Response(md, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="stockly-export-${todayJST}.md"`,
          },
        });
      }

      if (format === "csv") {
        const csv = formatAsCsv(stocks);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="stockly-export-${todayJST}.csv"`,
          },
        });
      }

      // JSON default
      const jsonBody = JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          date_jst: todayJST,
          count: stocks.length,
          stocks,
        },
        null,
        2,
      );
      return new Response(jsonBody, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="stockly-export-${todayJST}.json"`,
        },
      });
    },
  )

  // 今日の再発見取得（1日1件固定）
  .get("/api/stocks/rediscovery", async (c) => {
    const todayJST = getJSTDateString();
    const userId = getUserId(c);
    const rediscovery = await getDailyRediscoveryStock(c.env.DB, todayJST, userId);
    const stats = await getUserStats(c.env.DB, userId);
    const is_read = stats.last_rediscovery_date === todayJST;
    return c.json({ rediscovery, is_read });
  })

  // 再発見の読了記録 (+1件, +20pt)
  .post("/api/stocks/rediscovery/read", async (c) => {
    const todayJST = getJSTDateString();
    const userId = getUserId(c);
    const stats = await incrementRediscoveryCount(c.env.DB, todayJST, userId);
    return c.json({ success: true, stats, is_read: true });
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
    const userId = getUserId(c);

    // 現在のストリーク統計を取得して新しいストリークを計算
    const streakContext = await getStreakContext(c.env.DB, userId);
    const streakResult = calculateStreak(
      streakContext.last_stock_date,
      streakContext.current_streak,
      streakContext.max_streak,
      todayJST,
    );

    // D1 にストック保存および統計をバッチ更新
    await createStockWithStats(c.env.DB, {
      id,
      userId,
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
    const userId = getUserId(c);
    await deleteStockWithStats(c.env.DB, id, userId);
    return c.json({ success: true, id });
  })

  // ユーザー統計取得
  .get("/api/stats", async (c) => {
    const userId = getUserId(c);
    const stats = await getUserStats(c.env.DB, userId);
    return c.json(stats);
  })

  // 最新の週次 AI サマリー取得
  .get("/api/summary/weekly", async (c) => {
    try {
      const summary = await getLatestWeeklySummary(c.env.DB);
      const todayJST = getJSTDateString();

      // 直近7日間のストック件数も取得して返却
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
      const recentStocks = await getRecentStocksForSummary(c.env.DB, sevenDaysAgoStr);

      return c.json({
        summary,
        recentStockCount: recentStocks.length,
        todayJST,
      });
    } catch (err) {
      console.error("getLatestWeeklySummary error:", err);
      return c.json(
        {
          summary: null,
          recentStockCount: 0,
          error: "サマリーの取得中にエラーが発生しました",
        },
        500,
      );
    }
  })

  // 週次 AI サマリーのオンデマンド生成
  .post("/api/summary/weekly/generate", async (c) => {
    try {
      const todayJST = getJSTDateString();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

      // 直近7日間のストックを取得
      const recentStocks = await getRecentStocksForSummary(c.env.DB, sevenDaysAgoStr);

      if (recentStocks.length === 0) {
        return c.json(
          {
            error: "過去7日間のストックがありません。ストックを記録してから生成してください。",
          },
          400,
        );
      }

      // 週キーの計算 (例: 2026-W40)
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
      const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

      // AI サマリー生成
      const { summary: summaryText, keyThemes } = await generateWeeklySummaryText(
        c.env,
        recentStocks,
      );

      const id = crypto.randomUUID();
      const nowISO = new Date().toISOString();

      await saveWeeklySummary(c.env.DB, {
        id,
        week_key: weekKey,
        start_date: sevenDaysAgoStr,
        end_date: todayJST,
        stock_count: recentStocks.length,
        summary: summaryText,
        key_themes: keyThemes,
        now: nowISO,
      });

      const savedSummary: WeeklySummary = {
        id,
        week_key: weekKey,
        start_date: sevenDaysAgoStr,
        end_date: todayJST,
        stock_count: recentStocks.length,
        summary: summaryText,
        key_themes: keyThemes,
        created_at: nowISO,
        updated_at: nowISO,
      };

      return c.json(savedSummary, 201);
    } catch (err) {
      console.error("generateWeeklySummary error:", err);
      return c.json(
        {
          error: "週次サマリーの生成中にエラーが発生しました",
          details: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  });
