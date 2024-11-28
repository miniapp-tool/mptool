import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "cz-git";

const packages = readdirSync(
  join(dirname(fileURLToPath(import.meta.url)), "./packages/"),
);

const scopeComplete = execSync("git status --porcelain || true")
  .toString()
  .trim()
  .split("\n")
  .find((r) => ~r.indexOf("M  packages"))
  ?.replace(/\//g, "%%")
  ?.match(/packages%%((\w|-)*)/)?.[1];

export default defineConfig({
  extends: ["@commitlint/config-conventional"],
  rules: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "scope-enum": [2, "always", ["demo", "release", ...packages]],
  },
  prompt: {
    defaultScope: scopeComplete ?? "",
    customScopesAlign: !scopeComplete ? "top" : "bottom",
    allowCustomIssuePrefix: false,
    allowEmptyIssuePrefix: false,
  },
});
