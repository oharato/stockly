import { test, expect } from "@playwright/test";
import { setupCloudflareAccessProxy, cleanupTestUserStocks } from "./helpers/cf-proxy";

test.describe("Stockly Production Browser E2E Tests (https://stockly.ohchans.com)", () => {
  test.beforeAll(async ({ request }) => {
    // テスト実行前の安全な残存データ消去
    await cleanupTestUserStocks(request);
  });

  test.afterAll(async ({ request }) => {
    // テスト完了後の確実なクリーンアップ
    await cleanupTestUserStocks(request);
  });

  test.beforeEach(async ({ context, page, request }) => {
    // Cloudflare Access 認証 & WAF 回避の環境セットアップ
    await setupCloudflareAccessProxy(context, page, request);
  });

  test("1. 本番初期レンダリングと UI コンポーネントの正常表示", async ({ page }) => {
    await page.goto("/");

    // ヘッダーが表示されること
    await expect(page.locator("header")).toBeVisible({ timeout: 15000 });

    // 検索入力欄とボトムナビゲーションが表示されること
    await expect(page.locator("input[type='search']")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();

    // エラーバナーが表示されないこと
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);
  });

  test("2. ストック新規投稿、リアルタイム検索、および削除クリーンアップのフルライフサイクル", async ({
    page,
  }) => {
    const uniqueTag = `#E2E${Date.now().toString().slice(-4)}`;
    const uniqueText = `本番ブラウザ検証メモ ${uniqueTag} - 実DOMインタラクションによる自動テスト`;

    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15000 });

    // 1. 「+」ボタンをクリックしてモーダルを開く
    const plusButton = page.locator("button[aria-label='新しい内省をストック']");
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    // 2. モーダルのテキストエリアに入力
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 8000 });
    await textarea.fill(uniqueText);

    // 3. 「ストックする」ボタンをクリック
    const submitButton = page.locator("button:has-text('ストックする')");
    await submitButton.click();

    // 4. モーダルが正常に閉じること
    await expect(page.locator("dialog")).toHaveCount(0, { timeout: 12000 });

    // 5. タイムラインに作成したストックカードが DOM レンダリングされること
    const createdCard = page.locator(`article:has-text('${uniqueText}')`).first();
    await expect(createdCard).toBeVisible({ timeout: 12000 });

    // 6. 検索バーにキーワードを入力してリアルタイムフィルタリング
    const searchInput = page.locator("input[type='search']");
    await searchInput.click();
    await searchInput.fill(uniqueTag);
    await page.waitForTimeout(400);

    // フィルタリング結果に該当カードが表示され、エラーバナーが出ないこと
    await expect(createdCard).toBeVisible();
    const errorBanner = page.locator("div:has-text('ストックの取得に失敗しました')");
    await expect(errorBanner).toHaveCount(0);

    // 7. 検索条件をクリア
    const clearBtn = page.locator("button[aria-label='検索条件をクリア']");
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await searchInput.fill("");
    }
    await expect(searchInput).toHaveValue("");

    // 8. 高速連続タイピング時の耐障害性 (0ms 即時ローカル検索)
    await searchInput.click();
    await searchInput.pressSequentially("本番ブラウザ", { delay: 60 });
    await page.waitForTimeout(600);
    await expect(createdCard).toBeVisible();

    // 検索条件を再クリア
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await searchInput.fill("");
    }

    // 9. 作成したストックを削除して DOM から消滅することを確認
    const targetCard = page.locator(`article:has-text('${uniqueText}')`);
    await expect(targetCard).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    const deleteButton = targetCard.locator("button[aria-label='ストックを削除']");
    await deleteButton.click({ force: true });

    // タイムラインからカードの DOM 要素が消えること
    await expect(targetCard).toHaveCount(0, { timeout: 8000 });
  });

  test("3. ふりかえりタブ画面遷移と各種機能（目標・AIサマリー・エクスポート）の表示検証", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15000 });

    // 1. ボトムナビの「ふりかえり」タブをクリック
    const statsTabButton = page.locator("button:has-text('ふりかえり')").last();
    await expect(statsTabButton).toBeVisible();
    await statsTabButton.click();

    // 2. 目標・ビジョンセクションが表示されること
    await expect(page.locator("text=目標・ビジョン")).toBeVisible({ timeout: 8000 });

    // 3. 週次 AI 内省サマリーが表示されること
    await expect(page.locator("text=週次 AI 内省サマリー")).toBeVisible({ timeout: 8000 });

    // 4. データエクスポートボタンが表示されること
    await expect(page.locator("text=データエクスポート & バックアップ")).toBeVisible();
    await expect(page.locator("button:has-text('JSON')")).toBeVisible();
    await expect(page.locator("button:has-text('Markdown')")).toBeVisible();
    await expect(page.locator("button:has-text('CSV')")).toBeVisible();

    // 5. 「ストック」タブをクリックしてタイムライン画面に戻れること
    const stockTabButton = page.locator("button:has-text('ストック')").last();
    await stockTabButton.click();
    await expect(page.locator("input[type='search']")).toBeVisible();
  });
});
