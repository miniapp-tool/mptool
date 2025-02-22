import { hope } from "eslint-config-mister-hope";

export default hope({
  ignores: ["demo/**/*.js"],

  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.js"],
      },
    },
  },

  ts: {
    "@typescript-eslint/no-unnecessary-type-parameters": "off",
    "no-console": "off",
  },
});
