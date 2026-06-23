import { readdirSync } from "node:fs";
import path from "node:path";

const packages = readdirSync(path.join(import.meta.dirname, "./packages/"));

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["demo", "release", ...packages]],
  },
};
