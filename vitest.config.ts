import type { ViteUserConfigExport } from "vitest/config";
import { defineConfig } from "vitest/config";

const config: ViteUserConfigExport = defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["packages/*/src/**/*.ts"],
    },

    ...(process.env.CODECOV_TOKEN
      ? {
          reporters: ["junit"],
          outputFile: {
            junit: "coverage/test-report.junit.xml",
          },
        }
      : {}),
    typecheck: {
      enabled: true,
    },
  },
});

export default config;
