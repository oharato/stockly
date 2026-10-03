import { test, expect } from "@playwright/test";

test.describe("Stockly Production E2E Tests (https://stockly.ohchans.com)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error("[Prod Page Error]", err.message);
    });
  });

  test("1. Prod initial page load should display stocks and no error banner", async ({ page }) => {
    await page.goto("/");

    // ヘッダー確認
    await expect(page.locator("header")).toBeVisible();

    // エラーバナーが表示されていないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // タイムラインにストックカードが表示されること
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Prod keyword search should filter results without error", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    // 「テスト」を検索
    await searchInput.fill("テスト");
    await page.waitForTimeout(500);

    // エラーバナーがないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // 該当するストックカードが表示されていること
    const matchingCard = page.locator("article:has-text('テスト')").first();
    await expect(matchingCard).toBeVisible();

    // クリアボタンをクリック
    const clearBtn = page.locator("button[aria-label='検索条件をクリア']");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue("");
  });

  test("3. Prod rapid keystrokes should maintain UI resilience under rate limits", async ({
    page,
  }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    // 高速連続タイピング
    await searchInput.pressSequentially("チケット", { delay: 80 });
    await page.waitForTimeout(1000);

    // 画面にエラーバナーが出ないこと（ローカルファースト耐障害性）
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // 該当カードが表示されていること
    const card = page.locator("article:has-text('チケット')").first();
    await expect(card).toBeVisible();
  });

  test("4. Prod tag filter bar interaction should filter cleanly", async ({ page }) => {
    await page.goto("/");

    const tagButton = page.locator("button:has-text('#音楽')").first();
    if (await tagButton.isVisible()) {
      await tagButton.click();
      await page.waitForTimeout(500);

      const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
      await expect(errorBanner).toHaveCount(0);

      // 「すべて」で戻る
      const allButton = page.locator("button:has-text('すべて')").first();
      await allButton.click();
      await page.waitForTimeout(500);
      await expect(errorBanner).toHaveCount(0);
    }
  });
});
