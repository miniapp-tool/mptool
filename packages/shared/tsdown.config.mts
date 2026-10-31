import type { UserConfig } from "tsdown";

import { tsdownConfig } from "../../scripts/tsdown.js";

const config: UserConfig = tsdownConfig("index", {
  // `base64-arraybuffer` is the only runtime dependency of this package. It must be inlined into
  // the single `dist/index.js` bundle (the published package ships no `dependencies`); using
  // `onlyBundle` made rolldown emit a shared `rolldown-runtime-*.js` chunk that `index.js`
  // imported relatively, breaking the one-file ESM convention.
  alwaysBundle: ["base64-arraybuffer"],
});

export default config;
