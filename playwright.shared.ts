import { devices, type PlaywrightTestConfig } from "@playwright/test";

export const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export const chromiumDesktop = devices["Desktop Chrome"];

export const sharedPlaywrightConfig = {
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["html", { open: "never" }], ["list"]],
  outputDir: "test-results",
  use: {
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
} satisfies PlaywrightTestConfig;
