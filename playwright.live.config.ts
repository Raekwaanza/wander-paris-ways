import { defineConfig } from "@playwright/test";
import { chromiumDesktop, inheritedEnv, sharedPlaywrightConfig } from "./playwright.shared";

const openRouteServiceApiKey = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
if (!openRouteServiceApiKey) {
  throw new Error(
    "OPENROUTESERVICE_API_KEY is required for live E2E. Set it only in the server process environment and retry.",
  );
}

export default defineConfig({
  ...sharedPlaywrightConfig,
  retries: 0,
  workers: 1,
  reporter: [["html", { open: "never", outputFolder: "playwright-report/live" }], ["list"]],
  outputDir: "test-results/live",
  use: {
    ...sharedPlaywrightConfig.use,
    baseURL: "http://127.0.0.1:4175",
  },
  projects: [
    {
      name: "chromium-live-ors",
      testMatch: /live-ors\.spec\.ts/,
      use: { ...chromiumDesktop },
    },
  ],
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...inheritedEnv,
      NODE_ENV: "development",
      SCENIC_E2E_FIXTURES: "0",
      OPENROUTESERVICE_API_KEY: openRouteServiceApiKey,
      MAPTILER_API_KEY: "",
    },
  },
});
