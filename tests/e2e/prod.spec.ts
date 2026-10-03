import { test, expect } from "@playwright/test";

test.describe("Stockly Production E2E Tests (https://stockly.ohchans.com)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error("[Prod Page Error]", err.message);
    });
  });

  test("Prod Full User Lifecycle: Load, Search, Rapid Keystrokes, Tag Filter, and Stats/Export Navigation", async ({
    page,
  }) => {
    // 1. 本番トップ画面へのアクセス
    await page.goto("/");

    // ヘッダー確認
    await expect(page.locator("header")).toBeVisible({ timeout: 10000 });

    // エラーバナーが表示されていないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // タイムラインにストックカードが表示されること
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // 2. 通常キーワード検索の検証
    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("テスト");
    await page.waitForTimeout(400);

    // エラーバナーがなく、該当カードが表示されること
    await expect(errorBanner).toHaveCount(0);
    const matchingCard = page.locator("article:has-text('テスト')").first();
    await expect(matchingCard).toBeVisible();

    // 検索条件をクリア
    const clearBtn = page.locator("button[aria-label='検索条件をクリア']");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue("");

    // 3. 高速連続タイピング時の耐障害性 (0ms 即時ローカル検索)
    await searchInput.pressSequentially("テスト", { delay: 60 });
    await page.waitForTimeout(600);

    // エラーバナーが出ず、カードが表示されること
    await expect(errorBanner).toHaveCount(0);
    await expect(matchingCard).toBeVisible();

    // 検索条件をクリア
    await clearBtn.click();
    await expect(searchInput).toHaveValue("");

    // 4. タグフィルターの動作検証
    const tagButton = page.locator("button:has-text('#音楽')").first();
    if (await tagButton.isVisible()) {
      await tagButton.click();
      await page.waitForTimeout(400);
      await expect(errorBanner).toHaveCount(0);

      // 「すべて」で戻る
      const allButton = page.locator("button:has-text('すべて')").first();
      await allButton.click();
      await page.waitForTimeout(400);
      await expect(errorBanner).toHaveCount(0);
    }

    // 5. 「ふりかえり」タブへの遷移と新機能（週次サマリー & データエクスポート）の表示検証
    const statsTabButton = page.locator("button:has-text('ふりかえり')").last();
    await expect(statsTabButton).toBeVisible();
    await statsTabButton.click();

    // 目標・ビジョンが表示されること
    await expect(page.locator("text=目標・ビジョン")).toBeVisible({ timeout: 8000 });

    // 週次 AI サマリーが表示されること
    await expect(page.locator("text=週次 AI 内省サマリー")).toBeVisible({ timeout: 8000 });

    // データエクスポート & バックアップが表示されること
    await expect(page.locator("text=データエクスポート & バックアップ")).toBeVisible();
    await expect(page.locator("button:has-text('JSON')")).toBeVisible();
    await expect(page.locator("button:has-text('Markdown')")).toBeVisible();
    await expect(page.locator("button:has-text('CSV')")).toBeVisible();

    // 6. 「ストック」タブに戻る
    const stockTabButton = page.locator("button:has-text('ストック')").last();
    await stockTabButton.click();
    await expect(page.locator("input[type='search']")).toBeVisible();
  });
});
