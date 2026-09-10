import type { UserConfig } from "tsdown";

import { tsdownConfig } from "../../scripts/tsdown.js";

const config: UserConfig = tsdownConfig("index", { alwaysBundle: [/^@mptool\//u] });

export default config;
