import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ["packages/*/src/**/*.ts"],
    },
    reporters: ["junit"],
    outputFile: {
      junit: "coverage/test-report.junit.xml",
    },
    typecheck: {
      enabled: true,
    },
  },
});
