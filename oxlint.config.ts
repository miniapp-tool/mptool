import { defineConfig } from "oxlint";
import { defaultIgnorePatterns, getOxlintConfigs } from "oxc-config-hope/oxlint";

export default defineConfig({
  extends: getOxlintConfigs({
    vitest: {
      bench: true,
    },
  }),
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: [...defaultIgnorePatterns, "demo/**/*.js"],
  rules: {
    "no-console": "off",
    "import/no-assigned-import": ["warn", { allow: ["@mptool/mock"] }],
    "typescript/no-unnecessary-type-parameters": "off",
    "unicorn/text-encoding-identifier-case": "off",
    "unicorn/prefer-code-point": "off",
  },
});
