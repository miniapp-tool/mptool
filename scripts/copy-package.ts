import { rmSync } from "node:fs";

import { copy } from "./copy.js";

const parentFolderPath = "./demo/node_modules/@mptool";

try {
  rmSync(parentFolderPath, { recursive: true });
} catch {
  // do nothing
}

copy("./packages/file/dist", `${parentFolderPath}/file/dist`);
copy("./packages/file/package.json", `${parentFolderPath}/file/package.json`);

copy("./packages/enhance/dist", `${parentFolderPath}/enhance/dist`);
copy(
  "./packages/enhance/package.json",
  `${parentFolderPath}/enhance/package.json`,
);
