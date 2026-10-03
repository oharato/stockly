import { Hono } from "hono";
import { cors } from "hono/cors";
import { stockRoutes } from "./routes/stocks";

export type Bindings = {
  DB: D1Database;
  AI?: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

// 開発時の CORS 許可
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ヘルスチェックとストックルートの結合
const routes = app
  .get("/api/health", (c) => {
    return c.json({ status: "ok", time: new Date().toISOString() });
  })
  .route("/", stockRoutes);

export type AppType = typeof routes;
export * from "./schemas/stock";
export default app;
