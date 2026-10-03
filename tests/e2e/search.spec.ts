import { test, expect } from "@playwright/test";

test.describe("Stockly Keyword Search & Navigation E2E", () => {
  test.beforeEach(async ({ page }) => {
    // コンソールエラーおよびネットワークエラーを監視
    page.on("pageerror", (err) => {
      console.error("[Page Error]", err.message);
    });
  });

  test("1. Initial page load should display stocks and no error banner", async ({ page }) => {
    await page.goto("/");

    // タイトルまたはヘッダーの確認
    await expect(page.locator("header")).toBeVisible();

    // エラーバナーが存在しないことを確認
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // タイムラインのストックカードが表示されること
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Keyword search should filter results without triggering error banner", async ({
    page,
  }) => {
    const failedRequests: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 400 && res.url().includes("/api/")) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto("/");

    // 検索入力欄を取得
    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    // 「テスト」と入力
    await searchInput.fill("テスト");

    // デバウンス(250ms)後のAPIレスポンスを待つ
    await page.waitForTimeout(1000);

    // エラーバナーが表示されないことを確認
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // API エラーが発生していないこと
    expect(failedRequests).toEqual([]);

    // 検索結果に「テスト」が含まれるカードが表示されること
    const matchingCard = page.locator("article:has-text('テスト')").first();
    await expect(matchingCard).toBeVisible();

    // クリアボタンをクリック
    const clearBtn = page.locator("button[aria-label='検索条件をクリア']");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // 入力欄が空になること
    await expect(searchInput).toHaveValue("");
  });

  test("3. Rapid keystrokes should not produce race-condition errors", async ({ page }) => {
    const apiErrors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 400 && res.url().includes("/api/")) {
        apiErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto("/");
    const searchInput = page.locator("input[type='search']");
    await expect(searchInput).toBeVisible();

    // 高速に1文字ずつタイプ (人間のタイピングシミュレーション)
    await searchInput.pressSequentially("チケット", { delay: 100 });

    await page.waitForTimeout(1500);

    // ローカルファースト耐障害性: サーバーが 429 スロットリング等を返しても画面にエラーバナーを出さないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // 検索結果に「チケット」を含むカードが正しく表示されていること (ローカル即時フィルタリングの検証)
    const card = page.locator("article:has-text('チケット')").first();
    await expect(card).toBeVisible();
  });

  test("4. Tag filter bar interaction should filter cleanly", async ({ page }) => {
    await page.goto("/");

    // タグチップ一覧を探す
    const tagButton = page.locator("button:has-text('#音楽')").first();
    if (await tagButton.isVisible()) {
      await tagButton.click();
      await page.waitForTimeout(500);

      // エラーバナーがないこと
      const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
      await expect(errorBanner).toHaveCount(0);

      // 「すべて」をクリックして解除
      const allButton = page.locator("button:has-text('すべて')").first();
      await allButton.click();
      await page.waitForTimeout(500);
      await expect(errorBanner).toHaveCount(0);
    }
  });
});
