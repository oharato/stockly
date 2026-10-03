import { describe, expect, it } from "vite-plus/test";

// ローカル開発サーバー (Vite Proxy: 5173 または API: 8787)
const API_BASE_URL = process.env.TEST_API_URL || "http://127.0.0.1:8787";

describe("Live Server E2E Critical Path Tests", () => {
  // サーバーが稼働しているか事前確認
  async function isServerRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(1000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  it("should complete full user lifecycle against running server", async (ctx) => {
    const online = await isServerRunning();
    if (!online) {
      console.warn(
        `[E2E Skipped] Server at ${API_BASE_URL} is not reachable. Skipping live E2E test.`,
      );
      ctx.skip();
      return;
    }

    // 1. ヘルスチェック
    const healthRes = await fetch(`${API_BASE_URL}/api/health`);
    expect(healthRes.status).toBe(200);
    const healthData = (await healthRes.json()) as any;
    expect(healthData.status).toBe("ok");

    // 2. 新規ストック作成 (E2Eテスト専用データ)
    const testContent = `【E2E自動テスト】実行時刻: ${new Date().toISOString()}`;
    const createRes = await fetch(`${API_BASE_URL}/api/stocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: testContent }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;
    expect(created.id).toBeDefined();
    expect(created.content).toBe(testContent);

    // 3. 一覧取得で作成したストックが存在することを確認
    const listRes = await fetch(`${API_BASE_URL}/api/stocks`);
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any;
    const found = listData.stocks.find((s: any) => s.id === created.id);
    expect(found).toBeDefined();
    expect(found.content).toBe(testContent);

    // 4. 非同期 AI コメント生成の検証 (最大2秒待機して polling)
    let aiCommentGenerated = false;
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const pollRes = await fetch(`${API_BASE_URL}/api/stocks`);
      const pollData = (await pollRes.json()) as any;
      const polledStock = pollData.stocks.find((s: any) => s.id === created.id);
      if (polledStock?.ai_comment) {
        aiCommentGenerated = true;
        expect(typeof polledStock.ai_comment).toBe("string");
        break;
      }
    }
    expect(aiCommentGenerated).toBe(true);

    // 5. キーワード検索の検証
    const searchRes = await fetch(`${API_BASE_URL}/api/stocks?q=E2E自動テスト`);
    expect(searchRes.status).toBe(200);
    const searchData = (await searchRes.json()) as any;
    expect(searchData.stocks.length).toBeGreaterThanOrEqual(1);
    expect(searchData.stocks[0].content).toContain("E2E自動テスト");

    // 6. 今日の再発見 API の検証
    const rediscoveryRes = await fetch(`${API_BASE_URL}/api/stocks/rediscovery`);
    expect(rediscoveryRes.status).toBe(200);
    const rediscoveryData = (await rediscoveryRes.json()) as any;
    // ストックが1件以上存在するため再発見カードが返る
    expect(rediscoveryData.rediscovery).toBeDefined();

    // 7. 再発見の読了アクション (+20pt, +1 rediscovery_count)
    const readRediscoveryRes = await fetch(`${API_BASE_URL}/api/stocks/rediscovery/read`, {
      method: "POST",
    });
    expect(readRediscoveryRes.status).toBe(200);
    const readRediscoveryData = (await readRediscoveryRes.json()) as any;
    expect(readRediscoveryData.success).toBe(true);
    expect(readRediscoveryData.stats.rediscovery_count).toBeGreaterThan(0);

    // 8. 画像アップロードと添付ストックの検証
    const form = new FormData();
    const blob = new Blob(["fake-image-bytes"], { type: "image/png" });
    form.append("file", blob, "test.png");
    const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: form,
    });
    expect(uploadRes.status).toBe(201);
    const uploadData = (await uploadRes.json()) as any;
    expect(uploadData.key).toBeDefined();

    // メディア取得APIの検証
    const mediaRes = await fetch(`${API_BASE_URL}/api/media/${uploadData.key}`);
    expect(mediaRes.status).toBe(200);

    // 画像付きストック作成
    const imgStockRes = await fetch(`${API_BASE_URL}/api/stocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "【E2E画像ストック】画像付きテスト",
        imageKeys: [uploadData.key],
      }),
    });
    expect(imgStockRes.status).toBe(201);
    const imgStock = (await imgStockRes.json()) as any;
    expect(imgStock.image_keys).toContain(uploadData.key);

    // 画像付きストックのクリーンアップ削除
    await fetch(`${API_BASE_URL}/api/stocks/${imgStock.id}`, { method: "DELETE" });

    // 9. 統計情報の取得 (スコア・ストリークが正しく加算されていること)
    const statsRes = await fetch(`${API_BASE_URL}/api/stats`);
    expect(statsRes.status).toBe(200);
    const statsData = (await statsRes.json()) as any;
    expect(statsData.total_stocks).toBeGreaterThan(0);
    expect(statsData.score).toBeGreaterThanOrEqual(10);
    expect(statsData.current_streak).toBeGreaterThanOrEqual(1);

    // 10. 作成したテストストックの削除クリーンアップ
    const deleteRes = await fetch(`${API_BASE_URL}/api/stocks/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);

    // 11. 削除後に一覧から除外されていることを確認
    const afterDeleteListRes = await fetch(`${API_BASE_URL}/api/stocks`);
    const afterDeleteListData = (await afterDeleteListRes.json()) as any;
    const afterFound = afterDeleteListData.stocks.find((s: any) => s.id === created.id);
    expect(afterFound).toBeUndefined();
  });
});
