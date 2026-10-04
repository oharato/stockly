import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

/**
 * テスト専用ユーザー (e2e-test) の残存データを安全に一括消去するヘルパー
 */
export async function cleanupTestUserStocks(request: APIRequestContext): Promise<void> {
  if (!process.env.CF_ACCESS_CLIENT_ID || !process.env.CF_ACCESS_CLIENT_SECRET) {
    return;
  }

  try {
    const headers = {
      "X-Stockly-User-Id": "e2e-test",
      "User-Agent": "Stockly-E2E-Runner/1.0",
      "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
      "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET,
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
    console.warn("[Prod E2E Cleanup Warning]:", e);
  }
}

/**
 * Cloudflare Access 認証 & データセンター IP からの Bot Challenge (Managed Challenge) 回避
 * - CF_Authorization Cookie の事前注入
 * - /api/* 通信の Node.js APIRequestContext 経由での透過代行 (BoringSSL TLS 指紋による Bot 回避)
 * - navigator.webdriver の隠蔽
 * - ネイティブ確認ダイアログの自動承認
 */
export async function setupCloudflareAccessProxy(
  context: BrowserContext,
  page: Page,
  request: APIRequestContext,
): Promise<void> {
  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "❌ Cloudflare Access Service Token が未設定です。CF_ACCESS_CLIENT_ID と CF_ACCESS_CLIENT_SECRET を設定してください。",
    );
  }

  // 1. Cloudflare Access 認証 Cookie (CF_Authorization) の事前取得とブラウザ注入
  try {
    const res = await request.get("https://stockly.ohchans.com/", {
      headers: {
        "CF-Access-Client-Id": clientId,
        "CF-Access-Client-Secret": clientSecret,
      },
    });
    const cookies = res
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value);
    for (const cookieStr of cookies) {
      const match = cookieStr.match(/CF_Authorization=([^;]+)/);
      if (match) {
        await context.addCookies([
          {
            name: "CF_Authorization",
            value: match[1],
            domain: "stockly.ohchans.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "None",
          },
        ]);
        break;
      }
    }
  } catch (e) {
    console.warn("[Prod E2E] Failed to pre-fetch CF_Authorization cookie:", e);
  }

  // 2. Cloudflare Bot Challenge 回避:
  // ブラウザからの API 通信 (/api/*) を、Chromium/BoringSSL の TLS 指紋を持つ
  // Node.js の Playwright APIRequestContext 経由で透過代行して fulfill
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.includes("beacon.min.js")) {
      await route.abort();
      return;
    }

    if (url.includes("/api/")) {
      const method = req.method();
      const postData = req.postData();
      const contentType = req.headers()["content-type"] || "application/json";

      const headers: Record<string, string> = {
        accept: "application/json, text/plain, */*",
        "content-type": contentType,
        "user-agent": "Stockly-E2E-Runner/1.0",
        "x-stockly-user-id": "e2e-test",
        "cf-access-client-id": clientId,
        "cf-access-client-secret": clientSecret,
      };

      try {
        const response = await request.fetch(url, {
          method,
          headers,
          data: postData || undefined,
        });

        await route.fulfill({ response });
      } catch (e) {
        console.error("[Prod API Proxy Error]", e);
        await route.abort();
      }
      return;
    }

    // 静的アセット等の同一ドメインリクエストに Service Token と テストユーザーID を注入
    if (url.includes("stockly.ohchans.com")) {
      const headers = {
        ...req.headers(),
        "x-stockly-user-id": "e2e-test",
        "cf-access-client-id": clientId,
        "cf-access-client-secret": clientSecret,
      };
      await route.continue({ headers });
    } else {
      await route.continue();
    }
  });

  // 3. navigator.webdriver 隠蔽
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });

  // 4. ダイアログ自動承認 & エラー監視
  page.on("dialog", (dialog) => {
    void dialog.accept();
  });
  page.on("pageerror", (err) => {
    console.error("[Prod Page Error]", err.message);
  });
}
