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
    files: ["**/*.ts"],
    rules: {
      // some api use type parameters to define return value types
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
    },
  },
);
