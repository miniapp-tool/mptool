import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { UserConfig } from "cz-git";

const packages = readdirSync(
  join(dirname(fileURLToPath(import.meta.url)), "./packages/"),
);

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "scope-enum": [2, "always", ["demo", "release", ...packages]],
  },
} as UserConfig;
