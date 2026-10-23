import type { UserConfig } from "tsdown";

import { tsdownConfig } from "../../scripts/tsdown.js";

const config: UserConfig = tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u],
  treeshake: {
    // Keep `src/implements/` modules which register `decoders`/`encoders`
    // via side-effect-only imports from being tree-shaken away.
    // Normalize separators: on Windows the module id uses `\`, which made the
    // original "/implements/" check silently drop every codec from `dist`.
    moduleSideEffects: (id) => id.replaceAll("\\", "/").includes("/implements/"),
  },
});

export default config;
