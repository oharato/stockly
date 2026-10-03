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
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ヘルスチェックとストックルートの結合
const routes = app
  .get("/api/health", (c) => {
    return c.json({ status: "ok", time: new Date().toISOString() });
  })
  .get("/api/auth/login", (c) => {
    // Cloudflare Access 認証完了後にこのエンドポイントへ到達するため、トップ画面へリダイレクト
    return c.redirect("/");
  })
  .route("/", stockRoutes);

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
