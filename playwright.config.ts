import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/e2e.spec.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174/jarvis-web/",
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4174 --strictPort",
    env: { VITE_BASE_PATH: "/jarvis-web/" },
    url: "http://127.0.0.1:4174/jarvis-web/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
