import { test as base, expect } from "@playwright/test";
import { setupCloudflareAccessProxy } from "./cf-proxy";

export const test = base.extend<{ cloudflareProxy: void }>({
  cloudflareProxy: [
    async ({ context, page, request }, use) => {
      const stopProxy = await setupCloudflareAccessProxy(context, page, request);
      try {
        await use();
      } finally {
        // この fixture は request に依存するため、通信の完了後に request が破棄される。
        await stopProxy();
      }
    },
    // 30 秒の API timeout 後も、abort/fulfill の完了を待つ時間を確保する。
    { auto: true, timeout: 45000 },
  ],
});

export { expect };
