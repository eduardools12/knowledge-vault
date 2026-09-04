import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment on purpose: the suite targets the security-critical pure
    // functions (route classification, redirect validation, input schemas), not
    // component rendering. A DOM would add cost without adding coverage.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // The integration tests talk to a real Supabase project in São Paulo, so
    // the default 5s timeout is not enough for a sign-in plus a round trip.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/features/**/schemas.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
