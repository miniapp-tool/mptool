import { tsdownConfig } from "../../scripts/tsdown.js";

export default tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//],
  format: "esm",
  fixedExtension: false,
});
