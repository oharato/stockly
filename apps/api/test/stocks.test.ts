import { describe, expect, it } from "vite-plus/test";
import app from "../src/index";
import { createMockDB } from "./helpers/mock-db";

describe("Stockly API Endpoints", () => {
  it("GET /api/health should return ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.time).toBeDefined();
  });

  it("GET /api/stocks should return empty list initially", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/api/stocks", {}, { DB: mockDB });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.stocks).toEqual([]);
  });

  it("POST /api/stocks should validate empty content", async () => {
    const mockDB = createMockDB();
    const res = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      },
      { DB: mockDB },
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/stocks should create a new stock", async () => {
    const mockDB = createMockDB();
    const res = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "テスト内省メモ" }),
      },
      { DB: mockDB },
    );
    expect(res.status).toBe(201);

    const created = (await res.json()) as any;
    expect(created.id).toBeDefined();
    expect(created.content).toBe("テスト内省メモ");
    expect(created.created_at).toBeDefined();
  });

  it("GET /api/stats should return stats", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/api/stats", {}, { DB: mockDB });
    expect(res.status).toBe(200);

    const stats = (await res.json()) as any;
    expect(stats.score).toBe(0);
    expect(stats.total_stocks).toBe(0);
  });

  it("DELETE /api/stocks/:id should delete an existing stock", async () => {
    const mockDB = createMockDB();
    // まず作成
    const postRes = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "削除対象のメモ" }),
      },
      { DB: mockDB },
    );
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()) as any;

    // 削除実行
    const delRes = await app.request(
      `/api/stocks/${created.id}`,
      { method: "DELETE" },
      { DB: mockDB },
    );
    expect(delRes.status).toBe(200);
    const delData = (await delRes.json()) as any;
    expect(delData.success).toBe(true);

    // 削除後に一覧取得
    const listRes = await app.request("/api/stocks", {}, { DB: mockDB });
    const listData = (await listRes.json()) as any;
    expect(listData.stocks).toHaveLength(0);
  });
});
