import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    // In sandboxed environments, `os.networkInterfaces()` can fail (uv_interface_addresses).
    // Explicitly binding to localhost avoids Next's auto-detection.
    // Also avoid --turbopack in CI/sandboxes to reduce watcher usage (EMFILE).
    command: `npx next dev -H 127.0.0.1 -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SKIP_AUTH: "true",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3999",
      NEXT_PUBLIC_BASE_PATH: "",
      PORT: String(PORT),
      // Reduce file-descriptor usage in constrained sandboxes.
      WATCHPACK_POLLING: "true",
      CHOKIDAR_USEPOLLING: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Prefer the machine Chrome so CI/local can skip `playwright install`.
        channel: process.env.PW_CHANNEL ?? "chrome",
      },
    },
  ],
});
