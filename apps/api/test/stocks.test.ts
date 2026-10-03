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

  it("GET /api/stocks?q=... should filter stocks by keyword", async () => {
    const mockDB = createMockDB();

    await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "朝のルーティン: 散歩と読書" }),
      },
      { DB: mockDB },
    );

    await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "夜の振り返り: 筋トレと瞑想" }),
      },
      { DB: mockDB },
    );

    // "朝" で検索
    const res1 = await app.request("/api/stocks?q=朝", {}, { DB: mockDB });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as any;
    expect(data1.stocks).toHaveLength(1);
    expect(data1.stocks[0].content).toContain("朝");

    // "読書" で検索
    const res2 = await app.request("/api/stocks?q=読書", {}, { DB: mockDB });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as any;
    expect(data2.stocks).toHaveLength(1);
    expect(data2.stocks[0].content).toContain("読書");

    // ヒットなし
    const res3 = await app.request("/api/stocks?q=プログラミング", {}, { DB: mockDB });
    const data3 = (await res3.json()) as any;
    expect(data3.stocks).toHaveLength(0);
  });

  it("GET /api/stocks/rediscovery and POST /read should retrieve daily stock and award points", async () => {
    const mockDB = createMockDB();

    // 過去のストックを作成
    await mockDB.batch([
      mockDB
        .prepare("INSERT INTO stocks (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .bind(
          "past-1",
          "過去の学び: 小さな一歩を毎日続けること",
          "2026-09-01T10:00:00.000Z",
          "2026-09-01T10:00:00.000Z",
        ),
    ]);

    // 今日の再発見取得
    const getRes = await app.request("/api/stocks/rediscovery", {}, { DB: mockDB });
    expect(getRes.status).toBe(200);
    const getData = (await getRes.json()) as any;
    expect(getData.rediscovery).toBeDefined();
    expect(getData.rediscovery.id).toBe("past-1");
    expect(getData.rediscovery.content).toContain("過去の学び");

    // 振り返り読了アクション実行 (+20pt, +1 rediscovery_count)
    const readRes = await app.request(
      "/api/stocks/rediscovery/read",
      { method: "POST" },
      { DB: mockDB },
    );
    expect(readRes.status).toBe(200);
    const readData = (await readRes.json()) as any;
    expect(readData.success).toBe(true);
    expect(readData.stats.rediscovery_count).toBe(1);
    expect(readData.stats.score).toBe(20);
  });

  it("POST /api/upload should validate and accept image files", async () => {
    const mockDB = createMockDB();

    // 1. ファイルなしのリクエストは 400
    const emptyRes = await app.request(
      "/api/upload",
      { method: "POST", body: new FormData() },
      { DB: mockDB },
    );
    expect(emptyRes.status).toBe(400);

    // 2. 有効な画像ファイルのアップロード
    const formData = new FormData();
    const file = new File(["dummy image content"], "photo.png", { type: "image/png" });
    formData.append("file", file);

    const uploadRes = await app.request(
      "/api/upload",
      { method: "POST", body: formData },
      { DB: mockDB },
    );
    expect(uploadRes.status).toBe(201);
    const uploadData = (await uploadRes.json()) as any;
    expect(uploadData.key).toBeDefined();
    expect(uploadData.url).toContain("/api/media/");

    // 3. 画像キー付きでストックを作成
    const postRes = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "画像付きストックのテスト",
          imageKeys: [uploadData.key],
        }),
      },
      { DB: mockDB },
    );
    expect(postRes.status).toBe(201);
    const postData = (await postRes.json()) as any;
    expect(postData.image_keys).toContain(uploadData.key);
  });

  it("POST /api/stocks should save tags and filter by tag", async () => {
    const mockDB = createMockDB();

    // タグ付きストックを投稿
    const postRes = await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "TypeScriptとSvelte5の学習記録",
          tagNames: ["エンジニアリング", "学習"],
        }),
      },
      { DB: mockDB },
    );
    expect(postRes.status).toBe(201);
    const postData = (await postRes.json()) as any;
    expect(postData.tags).toContain("エンジニアリング");
    expect(postData.tags).toContain("学習");

    // 別タグのストックを投稿
    await app.request(
      "/api/stocks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "今日のランニング記録",
          tagNames: ["健康"],
        }),
      },
      { DB: mockDB },
    );

    // タグ一覧取得
    const tagsRes = await app.request("/api/tags", {}, { DB: mockDB });
    expect(tagsRes.status).toBe(200);
    const tagsData = (await tagsRes.json()) as any;
    expect(tagsData.tags.length).toBeGreaterThanOrEqual(2);

    // タグで絞り込み
    const filterRes = await app.request("/api/stocks?tag=エンジニアリング", {}, { DB: mockDB });
    expect(filterRes.status).toBe(200);
    const filterData = (await filterRes.json()) as any;
    expect(filterData.stocks.length).toBe(1);
    expect(filterData.stocks[0].content).toContain("TypeScript");
  });

  it("Goals CRUD endpoints should work", async () => {
    const mockDB = createMockDB();

    // 1. 新規目標作成
    const createRes = await app.request(
      "/api/goals",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "フロントエンド技術の習熟",
          category: "learning",
          color: "teal",
        }),
      },
      { DB: mockDB },
    );
    expect(createRes.status).toBe(201);
    const goalData = (await createRes.json()) as any;
    expect(goalData.id).toBeDefined();
    expect(goalData.title).toBe("フロントエンド技術の習熟");

    // 2. 目標一覧取得
    const listRes = await app.request("/api/goals", {}, { DB: mockDB });
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any;
    expect(listData.goals.length).toBe(1);
    expect(listData.goals[0].id).toBe(goalData.id);

    // 3. 目標削除
    const deleteRes = await app.request(
      `/api/goals/${goalData.id}`,
      { method: "DELETE" },
      { DB: mockDB },
    );
    expect(deleteRes.status).toBe(200);

    // 4. 削除後の目標一覧取得
    const afterDeleteRes = await app.request("/api/goals", {}, { DB: mockDB });
    const afterDeleteData = (await afterDeleteRes.json()) as any;
    expect(afterDeleteData.goals.length).toBe(0);
  });
});
