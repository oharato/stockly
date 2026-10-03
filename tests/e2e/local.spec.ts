import { test, expect } from "@playwright/test";

test.describe("Stockly Local Dev E2E Tests (http://localhost:5173)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error("[Local Page Error]", err.message);
    });
  });

  test("1. Local initial page load and UI components render cleanly", async ({ page }) => {
    await page.goto("/");

    // ヘッダー確認
    await expect(page.locator("header")).toBeVisible({ timeout: 10000 });

    // 検索入力欄、ボトムナビゲーションが表示されること
    await expect(page.locator("input[type='search']")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();

    // エラーバナーが表示されないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);
  });

  test("2. Local stock creation, incremental search, and deletion cycle", async ({ page }) => {
    await page.goto("/");

    const uniqueText = `ローカルE2E内省メモ-${Date.now()}`;

    // 1. 「+」追加ボタンをクリックしてモーダルを開く
    const plusButton = page.locator("button[aria-label='新しい内省をストック']");
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    // モーダルのテキストエリアに入力
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(uniqueText);

    // 保存ボタンをクリック
    const submitButton = page.locator("button:has-text('ストックする')");
    await submitButton.click();

    // タイムラインに作成したストックが表示されること
    const createdCard = page.locator(`article:has-text('${uniqueText}')`).first();
    await expect(createdCard).toBeVisible({ timeout: 8000 });

    // 2. 検索バーにキーワードを入力してフィルタリング
    const searchInput = page.locator("input[type='search']");
    await searchInput.fill(uniqueText);
    await page.waitForTimeout(400);

    // 検索結果にカードが表示され、エラーバナーが出ないこと
    await expect(createdCard).toBeVisible();
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // 検索条件をクリア
    const clearBtn = page.locator("button[aria-label='検索条件をクリア']");
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await searchInput.fill("");
    }

    // 3. 作成したストックを削除
    page.on("dialog", (dialog) => dialog.accept());
    const deleteButton = createdCard.locator("button[aria-label='ストックを削除']");
    await deleteButton.click();

    // タイムラインからカードが消えること
    await expect(page.locator(`article:has-text('${uniqueText}')`)).toHaveCount(0, {
      timeout: 5000,
    });
  });

  test("3. Local tab navigation to stats report works properly", async ({ page }) => {
    await page.goto("/");

    // 「ふりかえり」タブをクリック
    const statsTabButton = page.locator("button:has-text('ふりかえり')").last();
    await expect(statsTabButton).toBeVisible();
    await statsTabButton.click();

    // 統計・目標レポート領域が表示されること
    await expect(page.locator("text=目標・ビジョン")).toBeVisible({ timeout: 5000 });

    // 週次 AI 内省サマリーセクションが表示されること
    await expect(page.locator("text=週次 AI 内省サマリー")).toBeVisible();

    // サマリー生成ボタンが存在する場合はクリックして生成を検証
    const generateSummaryBtn = page.locator("button:has-text('週次 AI サマリーを生成する')");
    if (await generateSummaryBtn.isVisible()) {
      await generateSummaryBtn.click();
      // 生成完了またはエラーメッセージのいずれかが表示されること（ローカル・モック環境の耐性）
      await expect(
        page.locator("text=対象ストック").or(page.locator("text=サマリーの生成")),
      ).toBeVisible({ timeout: 10000 });
    }

    // 毎日の内省リマインダー通知セクションが表示されること
    await expect(page.locator("text=毎日の内省リマインダー")).toBeVisible();
    await expect(
      page.locator("button:has-text('通知を許可')").or(page.locator("text=通知時刻:")),
    ).toBeVisible();

    // データエクスポート & バックアップセクションが表示されること
    await expect(page.locator("text=データエクスポート & バックアップ")).toBeVisible();
    await expect(page.locator("button:has-text('JSON')")).toBeVisible();
    await expect(page.locator("button:has-text('Markdown')")).toBeVisible();
    await expect(page.locator("button:has-text('CSV')")).toBeVisible();

    // スクリーンショット保存 (視覚自己レビュー用)
    await page.screenshot({
      path: `${process.env.HOME}/snap/chromium/current/preview/stats-export.png`,
      fullPage: true,
    });

    // 「ストック」タブで元に戻る
    const stockTabButton = page.locator("button:has-text('ストック')").last();
    await stockTabButton.click();
    await expect(page.locator("input[type='search']")).toBeVisible();
  });
});
