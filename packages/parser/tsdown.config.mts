import type { UserConfig } from "tsdown";

import { tsdownConfig } from "../../scripts/tsdown.js";

const config: UserConfig = tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u, "htmlparser2", "dom-serializer"],
});

export default config;
