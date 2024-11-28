import hopeConfig, { config, tsParser } from "eslint-config-mister-hope";

export default config(
  ...hopeConfig,

  {
    ignores: [
      "coverage/**",
      "demo/**/*.js",
      "**/lib/**",
      "**/node_modules/**",
      "**/.vuepress/.cache/",
      "**/.vuepress/.temp/",
    ],
  },

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        parser: tsParser,
        tsconfigDirName: import.meta.dirname,
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
    },
  },

  {
    files: ["**/rollup.config.mts"],
    rules: {
      "import-x/no-unresolved": "off",
    },
  },

  {
    files: ["**/*.spec-d.ts"],
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
);
