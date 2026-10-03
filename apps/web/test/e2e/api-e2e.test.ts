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

    // 4. 統計情報の取得
    const statsRes = await fetch(`${API_BASE_URL}/api/stats`);
    expect(statsRes.status).toBe(200);
    const statsData = (await statsRes.json()) as any;
    expect(statsData.total_stocks).toBeGreaterThan(0);

    // 5. 作成したテストストックの削除クリーンアップ
    const deleteRes = await fetch(`${API_BASE_URL}/api/stocks/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);

    // 6. 削除後に一覧から除外されていることを確認
    const afterDeleteListRes = await fetch(`${API_BASE_URL}/api/stocks`);
    const afterDeleteListData = (await afterDeleteListRes.json()) as any;
    const afterFound = afterDeleteListData.stocks.find((s: any) => s.id === created.id);
    expect(afterFound).toBeUndefined();
  });
});
