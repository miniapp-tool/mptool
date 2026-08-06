import { tsdownConfig } from "../../scripts/tsdown.js";

export default tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u],
  treeshake: {
    // Keep `src/implements/` modules which register `decoders`/`encoders`
    // via side-effect-only imports from being tree-shaken away
    moduleSideEffects: (id) => id.includes("/implements/"),
  },
});
