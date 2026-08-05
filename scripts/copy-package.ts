import { rmSync } from "node:fs";

import { copy } from "./copy.js";

const parentFolderPath = "./demo/node_modules/@mptool";

try {
  rmSync(parentFolderPath, { recursive: true });
} catch {
  // do nothing
}

// demo 依赖 @mptool/all（其 dist 已内联 api/enhance/file/net/parser）
copy("./packages/all/dist", `${parentFolderPath}/all/dist`);
copy("./packages/all/package.json", `${parentFolderPath}/all/package.json`);
