import { tsdownConfig } from "../../scripts/tsdown.js";

export default tsdownConfig("index", {
  onlyBundle: ["base64-arraybuffer"],
});
