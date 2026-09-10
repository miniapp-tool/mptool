import type { UserConfig } from "tsdown";

import { tsdownConfig } from "../../scripts/tsdown.js";

const config: UserConfig = tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u],
  format: "esm",
  fixedExtension: false,
});

export default config;
