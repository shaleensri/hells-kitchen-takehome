import { defineConfig } from "vitest/config";

// Single test runner for the whole workspace (shared + backend-app).
// Source-only workspace packages, no build step needed to run tests — see PLAN.md §5.1.
export default defineConfig({
  test: {
    include: ["shared/src/**/*.test.ts", "backend-app/src/**/*.test.ts"],
    environment: "node",
  },
});
