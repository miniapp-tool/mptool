import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ["packages/*/src/**/*.ts"],
    },
    typecheck: {
      enabled: true,
    },
  },
});
