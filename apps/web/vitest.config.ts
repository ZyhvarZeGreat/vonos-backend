import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = path.resolve(__dirname);

export default defineConfig({
  plugins: [react()],
  root,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(root, "vitest.setup.ts")],
    // Stay inside the web app — never pick up monorepo `.publish` mirrors.
    include: [
      "lib/**/*.{spec,test}.{ts,tsx}",
      "components/**/*.{spec,test}.{ts,tsx}",
      "stores/**/*.{spec,test}.{ts,tsx}",
      "app/**/*.{spec,test}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/e2e/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.publish/**",
    ],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
