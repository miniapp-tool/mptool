import { rmSync } from "node:fs";

import { copy } from "./copy.js";

const parentFolderPath = "./demo/node_modules/@mptool";

try {
  rmSync(parentFolderPath, { recursive: true });
} catch (err) {
  // do nothing
}

copy("./packages/file/lib", `${parentFolderPath}/file/lib`);
copy("./packages/file/package.json", `${parentFolderPath}/file/package.json`);

copy("./packages/enhance/lib", `${parentFolderPath}/enhance/lib`);
copy(
  "./packages/enhance/package.json",
  `${parentFolderPath}/enhance/package.json`,
);
