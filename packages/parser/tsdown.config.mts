import { tsdownConfig } from "../../scripts/tsdown.js";

export default tsdownConfig("index", {
  alwaysBundle: [/^@mptool\//u, "htmlparser2", "dom-serializer"],
});
