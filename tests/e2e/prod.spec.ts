import { test, expect, type APIRequestContext } from "@playwright/test";

// テスト専用ユーザーの残存データを安全に一括消去するヘルパー
async function cleanupTestUserStocks(request: APIRequestContext) {
  try {
    const headers = {
      "X-Stockly-User-Id": "e2e-test",
      ...(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
        ? {
            "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
            "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET,
          }
        : {}),
    };
    const res = await request.get("https://stockly.ohchans.com/api/stocks", { headers });
    if (res.ok()) {
      const data = (await res.json()) as { stocks?: Array<{ id: string }> };
      if (data.stocks && data.stocks.length > 0) {
        for (const stock of data.stocks) {
          await request.delete(`https://stockly.ohchans.com/api/stocks/${stock.id}`, { headers });
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  } catch (e) {
    console.warn("[Prod E2E] Cleanup warning:", e);
  }
}

test.describe("Stockly Production E2E Tests (https://stockly.ohchans.com)", () => {
  test.beforeAll(async ({ request }) => {
    if (!process.env.CF_ACCESS_CLIENT_ID || !process.env.CF_ACCESS_CLIENT_SECRET) {
      throw new Error(
        "❌ Cloudflare Access Service Token が未設定です。.env に CF_ACCESS_CLIENT_ID と CF_ACCESS_CLIENT_SECRET を設定してください。",
      );
    }
    // 過去のテスト残存ストックがあれば一括消去
    await cleanupTestUserStocks(request);
  });

  test.afterAll(async ({ request }) => {
    // テスト終了後の確実なクリーンアップ
    await cleanupTestUserStocks(request);
  });

  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error("[Prod Page Error]", err.message);
    });
    // Cloudflare Analytics beacon の CORS プリフライト失敗を防止
    await page.route("**/beacon.min.js**", (route) => route.abort());
    // 確認ダイアログを自動承認
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });
  });

  test("Prod Full Isolated User Lifecycle: Create Stock, Search, Rapid Keystrokes, Navigation, and Deletion Cleanup", async ({
    page,
  }) => {
    const uniqueTag = `#E2E${Date.now().toString().slice(-4)}`;
    const uniqueText = `本番検証メモ ${uniqueTag} - テストユーザー分離による安全な自動テスト`;

    // 1. 本番トップ画面へのアクセス
    await page.goto("/");

    // ヘッダー確認 (エッジ通信とレンダリング待機)
    await expect(page.locator("header")).toBeVisible({ timeout: 15000 });

    // エラーバナーが表示されていないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // 2. ストック新規作成 (書き込みテスト)
    const plusButton = page.locator("button[aria-label='新しい内省をストック']");
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    // モーダルのテキストエリアに入力
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 8000 });
    await textarea.fill(uniqueText);

    // 保存ボタンをクリック
    const submitButton = page.locator("button:has-text('ストックする')");
    await submitButton.click();

    // 3. タイムラインに作成したストックが表示されること
    const createdCard = page.locator(`article:has-text('${uniqueText}')`).first();
    await expect(createdCard).toBeVisible({ timeout: 12000 });

    // 4. 通常キーワード検索の検証
    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    await searchInput.click();
    await searchInput.fill(uniqueTag);
    await page.waitForTimeout(400);

    // エラーバナーがなく、該当カードが表示されること
    await expect(errorBanner).toHaveCount(0);
    await expect(createdCard).toBeVisible();

    // 検索条件をクリア
    const clearBtn = page.locator("button[aria-label='検索条件をクリア']");
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await searchInput.fill("");
    }
    await expect(searchInput).toHaveValue("");

    // 5. 高速連続タイピング時の耐障害性 (0ms 即時ローカル検索)
    await searchInput.click();
    await searchInput.pressSequentially("本番検証", { delay: 60 });
    await page.waitForTimeout(600);

    // エラーバナーが出ず、カードが表示されること
    await expect(errorBanner).toHaveCount(0);
    await expect(createdCard).toBeVisible();

    // 検索条件をクリア
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await searchInput.fill("");
    }
    await expect(searchInput).toHaveValue("");

    // 6. 「ふりかえり」タブへの遷移と機能の表示検証
    const statsTabButton = page.locator("button:has-text('ふりかえり')").last();
    await expect(statsTabButton).toBeVisible();
    await statsTabButton.click();

    // 目標・ビジョンが表示されること
    await expect(page.locator("text=目標・ビジョン")).toBeVisible({ timeout: 8000 });

    // 週次 AI サマリーが表示されること
    await expect(page.locator("text=週次 AI 内省サマリー")).toBeVisible({ timeout: 8000 });

    // 毎日の内省リマインダーが表示されること
    await expect(page.locator("text=毎日の内省リマインダー")).toBeVisible({ timeout: 8000 });

    // データエクスポート & バックアップが表示されること
    await expect(page.locator("text=データエクスポート & バックアップ")).toBeVisible();
    await expect(page.locator("button:has-text('JSON')")).toBeVisible();
    await expect(page.locator("button:has-text('Markdown')")).toBeVisible();
    await expect(page.locator("button:has-text('CSV')")).toBeVisible();

    // 7. 「ストック」タブに戻る
    const stockTabButton = page.locator("button:has-text('ストック')").last();
    await stockTabButton.click();
    await expect(page.locator("input[type='search']")).toBeVisible();

    // 8. 作成したストックを削除してクリーンアップ
    const targetCard = page.locator(`article:has-text('${uniqueText}')`);
    await expect(targetCard).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(600);
    const deleteButton = targetCard.locator("button[aria-label='ストックを削除']");
    await deleteButton.click({ force: true });

    // タイムラインからカードが消えること
    await expect(targetCard).toHaveCount(0, { timeout: 8000 });
    await page.waitForTimeout(500);
  });
});
