import { hope } from "eslint-config-mister-hope";

export default hope({
  ignores: ["demo/**/*.js"],
  ts: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.js"],
      },
    },
    rules: {
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "no-console": "off",
    },
  },
});
