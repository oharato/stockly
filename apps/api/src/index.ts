import { Hono } from "hono";
import { cors } from "hono/cors";
import { stockRoutes } from "./routes/stocks";

export type Bindings = {
  DB: D1Database;
  AI?: Ai;
  STORAGE?: R2Bucket;
  ASSETS?: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 設定（ローカル開発および本番カスタムドメイン）
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://stockly.ohchans.com"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Stockly-User-Id",
      "CF-Access-Client-Id",
      "CF-Access-Client-Secret",
    ],
  }),
);

// ヘルスチェックとストックルートの結合
const routes = app
  .get("/api/health", async (c) => {
    try {
      if (!c.env?.DB) {
        return c.json({
          status: "ok",
          db: "skipped",
          message: "No DB binding in context",
          time: new Date().toISOString(),
        });
      }

      // D1 データベース接続 & stocks テーブル読み込み検証
      const stockCheck = await c.env.DB.prepare("SELECT COUNT(*) as count FROM stocks").first<{
        count: number;
      }>();

      const isHealthy = typeof stockCheck?.count === "number";
      return c.json(
        {
          status: isHealthy ? "ok" : "error",
          db: isHealthy ? "connected" : "unhealthy",
          stocks_count: stockCheck?.count ?? 0,
          time: new Date().toISOString(),
        },
        isHealthy ? 200 : 500,
      );
    } catch (e) {
      console.error("[Health Check Failed]", e);
      return c.json(
        {
          status: "error",
          db: "unhealthy",
          error: e instanceof Error ? e.message : "Unknown DB error",
          time: new Date().toISOString(),
        },
        500,
      );
    }
  })
  .get("/api/auth/login", (c) => {
    // Cloudflare Access 認証完了後にこのエンドポイントへ到達するため、トップ画面へリダイレクト
    return c.redirect("/");
  })
  .route("/", stockRoutes);

// API ルート未マッチ時の JSON 404 フォールバック（SPA HTML の誤返却を防止）
app.all("/api/*", (c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});

// 静的アセット（SPA PWA）フォールバック
app.all("*", (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.notFound();
});

export type AppType = typeof routes;
export * from "./schemas/stock";
export default app;
