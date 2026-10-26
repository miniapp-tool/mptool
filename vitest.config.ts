import type { ViteUserConfigExport } from "vitest/config";
import { defineConfig } from "vitest/config";

// GitHub Actions (and other CI providers) set `CI`. Whenever it is set, emit a JUnit report so the
// `codecov/test-results-action` upload in `.github/workflows/test.yml` always has a file to read.
// Keying this on `CODECOV_TOKEN` was broken: the token is only passed to the upload action, never
// to the `pnpm run test` step, so the report was never generated.
const isCI = Boolean(process.env.CI);

const config: ViteUserConfigExport = defineConfig({
  test: {
    // Tests resolve workspace packages through their `dist/`, so make `pnpm test` self-contained on a
    // clean checkout by building only when the output is missing (a no-op in CI and normal local runs).
    globalSetup: ["./scripts/vitest-setup.ts"],
    setupFiles: ["./scripts/vitest-silence.ts"],

    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["packages/*/src/**/*.ts"],
    },

    ...(isCI
      ? {
          // Keep the console reporter, the JUnit reporter is additive
          reporters: ["default", "junit"],
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
