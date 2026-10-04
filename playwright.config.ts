import * as fs from "node:fs";
import * as path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Auto-load .env
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {}
  }
}

const isProdOnly =
  process.env.E2E_TARGET === "prod" ||
  process.argv.some((arg) => arg === "prod" || arg.includes("project=prod"));

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Pixel 7"],
  },
  projects: [
    {
      name: "local",
      testMatch: /local\.spec\.ts/,
      use: {
        baseURL: "http://localhost:5173",
        ...devices["Pixel 7"],
      },
    },
    {
      name: "prod",
      testMatch: /prod\.spec\.ts/,
      use: {
        baseURL: "https://stockly.ohchans.com",
        ...devices["Pixel 7"],
        extraHTTPHeaders:
          process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
            ? {
                "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
                "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET,
              }
            : undefined,
      },
    },
  ],
  // ローカルサーバーの自動起動 (本番実行時は不要なためスキップ)
  webServer: isProdOnly
    ? undefined
    : [
        {
          command: "pnpm --filter api run dev",
          port: 8787,
          reuseExistingServer: true,
          timeout: 15000,
        },
        {
          command: "pnpm --filter web run dev",
          port: 5173,
          reuseExistingServer: true,
          timeout: 15000,
        },
      ],
});
