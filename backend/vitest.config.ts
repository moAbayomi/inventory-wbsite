import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["./tests/setup/globalSetup.ts"],
    restoreMocks: true,
     fileParallelism: false, 
    coverage: {
          provider: "v8",
          reporter: ["text", "lcov"],
    },
    pool: 'threads',
    testTimeout: 20000,
    hookTimeout: 30000,
   },
})
