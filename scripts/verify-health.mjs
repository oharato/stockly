import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

// Auto-load .env for local testing
const envFile = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch {}
}

const clientId = process.env.CF_ACCESS_CLIENT_ID;
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
const baseUrl = process.env.TARGET_URL || "https://stockly.ohchans.com";

if (!clientId || !clientSecret) {
  console.error("❌ CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET must be set");
  process.exit(1);
}

const maxRetries = 10;
const retryDelayMs = 3000;

console.log(`🔍 Checking production health & DB status on ${baseUrl}/api/health...`);

async function checkHealth() {
  const apiContext = await request.newContext();

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Attempt ${attempt}/${maxRetries}] Requesting /api/health...`);
      try {
        const res = await apiContext.get(`${baseUrl}/api/health`, {
          headers: {
            "CF-Access-Client-Id": clientId,
            "CF-Access-Client-Secret": clientSecret,
            "User-Agent": "Stockly-E2E-Runner/1.0",
            Accept: "application/json",
          },
        });

        const status = res.status();
        let data = null;
        try {
          data = await res.json();
        } catch {
          const text = await res.text();
          console.warn(`Response is not JSON (status: ${status}): ${text.slice(0, 200)}`);
        }

        if (status === 200 && data && data.status === "ok" && data.db === "connected") {
          console.log("✅ Production health check & DB read verification passed!");
          console.log(`   - Status: ${data.status}`);
          console.log(`   - DB: ${data.db}`);
          console.log(`   - Stocks in DB: ${data.stocks_count}`);
          console.log(`   - Time: ${data.time}`);
          await apiContext.dispose();
          process.exit(0);
        }

        console.warn(`⚠️ Unexpected response (status ${status}):`, data);
      } catch (err) {
        console.warn(`⚠️ Request error:`, err instanceof Error ? err.message : err);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    console.error(`❌ Health check failed after ${maxRetries} attempts.`);
    process.exit(1);
  } finally {
    await apiContext.dispose();
  }
}

void checkHealth();
