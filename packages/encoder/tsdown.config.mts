import type { UserConfig } from "tsdown";

import { tsdownConfig } from "../../scripts/tsdown.js";

const config: UserConfig = tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u],
  treeshake: {
    // Keep `src/implements/` modules which register `decoders`/`encoders`
    // via side-effect-only imports from being tree-shaken away
    moduleSideEffects: (id) => id.includes("/implements/"),
  },
});

export default config;
