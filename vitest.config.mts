import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const localEnv = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
    // Integration tests use .env.local credentials but ALWAYS an isolated database.
    env: { ...(localEnv as Record<string, string>), MONGODB_DB_NAME: "vevvion_test" },
    alias: {
      // allow importing server modules in tests
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
