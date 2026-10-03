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
    baseURL: process.env.E2E_BASE_URL || "https://stockly.ohchans.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Pixel 7"],
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
