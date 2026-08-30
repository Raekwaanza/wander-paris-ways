import { defineConfig } from "@playwright/test";
import { chromiumDesktop, inheritedEnv, sharedPlaywrightConfig } from "./playwright.shared";

export default defineConfig({
  ...sharedPlaywrightConfig,
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : 2,
  use: {
    ...sharedPlaywrightConfig.use,
    baseURL: "http://127.0.0.1:4173",
  },
  projects: [
    {
      name: "chromium-fixtures",
      testIgnore: [/preview-navigation\.spec\.ts/, /live-ors\.spec\.ts/],
      use: { ...chromiumDesktop },
    },
    {
      name: "chromium-preview",
      testMatch: /preview-navigation\.spec\.ts/,
      use: {
        ...chromiumDesktop,
        baseURL: "http://127.0.0.1:4174",
      },
    },
  ],
  webServer: [
    {
      command: "bun run dev -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...inheritedEnv,
        NODE_ENV: "development",
        SCENIC_E2E_FIXTURES: "1",
        OPENROUTESERVICE_API_KEY: "",
        MAPTILER_API_KEY: "",
      },
    },
    {
      command: "bun run dev -- --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...inheritedEnv,
        NODE_ENV: "development",
        SCENIC_E2E_FIXTURES: "0",
        OPENROUTESERVICE_API_KEY: "",
        MAPTILER_API_KEY: "",
      },
    },
  ],
});
