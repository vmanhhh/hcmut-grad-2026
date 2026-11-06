import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Env for the invite-test Supabase project (gitignored). Process env wins over Next's .env.local.
if (existsSync(".env.test")) process.loadEnvFile(".env.test");

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./tests/e2e/global-setup.ts",
  // Tests share fixture rows in one database, so run serially.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
