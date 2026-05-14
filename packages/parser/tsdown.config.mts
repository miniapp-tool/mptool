import { tsdownConfig } from "../../scripts/tsdown.js";

export default tsdownConfig("index", { alwaysBundle: [/^@mptool\//u, "cheerio/slim"] });
