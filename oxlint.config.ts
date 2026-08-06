import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig(
  {
    ignore: ["demo/**/*.js"],
    rules: {
      "new-cap": [
        "warn",
        { capIsNewExceptions: ["App", "Behavior", "Component", "Emitter", "Page"] },
      ],
      "no-console": "off",
      "no-warning-comments": "off",
      "prefer-named-capture-group": "off",

      "import/no-unassigned-import": ["warn", { allow: ["@mptool/mock"] }],
      "typescript/no-unnecessary-type-parameters": "off",
      "unicorn/text-encoding-identifier-case": "off",
      "unicorn/prefer-code-point": "off",
      // we are targeting es6
      "unicorn/prefer-array-flat": "off",
      "unicorn/prefer-string-replace-all": "off",

      "vitest/consistent-test-it": "off",
      // Helper-based assertions (e.g. `expectError`) are intentional in specs.
      "vitest/expect-expect": "off",
    },
  },
  {
    files: ["*.spec.ts", "*.spec-d.ts"],
    rules: {
      "typescript/no-confusing-void-expression": "off",
      "typescript/no-explicit-any": "off",
      "typescript/no-unsafe-assignment": "off",
      "typescript/no-unsafe-member-access": "off",
      "typescript/unbound-method": "off",
      // Test fixtures legitimately contain template-literal syntax as strings.
      "no-template-curly-in-string": "off",
    },
  },
  {
    // Interpreter code (lexer/parser/interpreter) legitimately exceeds generic
    // structural limits (file length, method complexity, classes per file).
    // 解释器代码（lexer/parser/interpreter）天然超出通用结构性限制。
    files: ["packages/run/src/**/*.ts"],
    rules: {
      complexity: "off",
      "max-classes-per-file": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-statements": "off",
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
      "id-length": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
);
