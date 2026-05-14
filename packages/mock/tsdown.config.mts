import { tsdownConfig } from "../../scripts/tsdown.js";

export default tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u],
  format: "esm",
  fixedExtension: false,
});
