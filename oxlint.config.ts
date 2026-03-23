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
    "no-warning-comments": "off",
    "import/no-unassigned-import": ["warn", { allow: ["@mptool/mock"] }],
    "typescript/no-unnecessary-type-parameters": "off",
    "unicorn/text-encoding-identifier-case": "off",
    "unicorn/prefer-code-point": "off",
    // we are targeting es6
    "unicorn/prefer-array-flat": "off",
    "unicorn/prefer-string-replace-all": "off",
  },
  overrides: [
    {
      files: ["*.spec.ts", "*.spec-d.ts"],
      rules: {
        "typescript/no-confusing-void-expression": "off",
        "typescript/no-explicit-any": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/unbound-method": "off",
      },
    },
    {
      files: ["**/encoder/src/implements/*.ts"],
      rules: {
        complexity: "off",
        "max-classes-per-file": "off",
        "max-statements": "off",
      },
    },
    {
      files: ["**/mock/src/**/*.ts"],
      rules: {
        "jsdoc/require-param": "off",
        "jsdoc/require-returns": "off",
      },
    },
  ],
});
