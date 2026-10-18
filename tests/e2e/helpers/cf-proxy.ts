import type { APIRequestContext, APIResponse, BrowserContext, Page } from "@playwright/test";

/**
 * テスト専用ユーザー (e2e-test) の残存データを安全に一括消去するヘルパー
 */
export async function cleanupTestUserStocks(request: APIRequestContext): Promise<void> {
  if (!process.env.CF_ACCESS_CLIENT_ID || !process.env.CF_ACCESS_CLIENT_SECRET) {
    return;
  }

  const headers = {
    "X-Stockly-User-Id": "e2e-test",
    "User-Agent": "Stockly-E2E-Runner/1.0",
    "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
    "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET,
  };
  const res = await request.get("https://stockly.ohchans.com/api/stocks", { headers });
  if (!res.ok()) {
    throw new Error(`[Prod E2E Cleanup] Failed to list test stocks (HTTP ${res.status()})`);
  }
  const data = (await res.json()) as { stocks?: Array<{ id: string }> };
  if (!Array.isArray(data.stocks)) {
    throw new Error("[Prod E2E Cleanup] Invalid stock list response");
  }
  for (const stock of data.stocks) {
    const deleted = await request.delete(
      `https://stockly.ohchans.com/api/stocks/${encodeURIComponent(stock.id)}`,
      { headers },
    );
    if (!deleted.ok() && deleted.status() !== 404) {
      throw new Error(`[Prod E2E Cleanup] Failed to delete test stock (HTTP ${deleted.status()})`);
    }
    await new Promise((r) => setTimeout(r, 400));
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
): Promise<() => Promise<void>> {
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

  // ルート登録前に setup を完了し、登録後の失敗で teardown を失わないようにする。
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });
  page.on("dialog", (dialog) => {
    void dialog.accept();
  });
  page.on("pageerror", (err) => {
    console.error("[Prod Page Error]", err.message);
  });

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

      let response: APIResponse;
      try {
        response = await request.fetch(url, {
          method,
          headers,
          data: postData || undefined,
          timeout: 30000,
        });
      } catch (e) {
        console.error("[Prod API Proxy Error]", e);
        await route.abort();
        return;
      }
      // fulfill が失敗しても処理済みの route を再度 abort しない。
      await route.fulfill({ response });
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

  // request fixture が破棄される前に、進行中の fetch/fulfill をすべて完了させる。
  return () => context.unrouteAll({ behavior: "wait" });
}
