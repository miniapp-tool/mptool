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
    "new-cap": ["warn", { capIsNewExceptions: ["App", "Component", "Emitter", "Page"] }],
    "no-console": "off",
    "import/no-unassigned-import": ["warn", { allow: ["@mptool/mock"] }],
    "typescript/no-unnecessary-type-parameters": "off",
    "unicorn/text-encoding-identifier-case": "off",
    "unicorn/prefer-code-point": "off",
  },
  overrides: [
    {
      files: ["*.spec.ts", "*.spec-d.ts"],
      rules: {
        "typescript/no-explicit-any": "off",
      },
    },
  ],
});
