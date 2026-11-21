import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));
const stub = fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": src, "server-only": stub } },
  test: {
    // API test files share one app and mailbox, so files run one at a time.
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        // Runs against a live app (pnpm dev or Docker) with Postgres and Mailpit. See tests/README.md.
        extends: true,
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          globalSetup: ["tests/support/api-setup.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
