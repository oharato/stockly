import { defineConfig, devices } from "@playwright/test";

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
      },
    },
  ],
  // ローカルサーバーの自動起動 (本番実行時はスキップ、ローカル実行時はポート起動済みの場合は再利用)
  webServer:
    process.env.E2E_TARGET === "prod"
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
