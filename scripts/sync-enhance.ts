import path from "node:path";

import { copy } from "./copy.js";

const rootDir = path.resolve(import.meta.dirname, "..");

/**
 * 需要从 enhance 同步到 skyline-enhance 的共享文件（相对各包 src 的路径）
 *
 * 这些文件在两个包中内容完全一致，仅维护一份（enhance 为唯一来源）， 构建前通过本脚本同步，避免重复维护导致代码漂移。
 */
const sharedFiles = [
  "app/index.ts",
  "app/typings.ts",
  "component/index.ts",
  "component/store.ts",
  "config/index.ts",
  "emitter/index.ts",
  "emitter/typings.ts",
  "hotReload.ts",
  "navigator/index.ts",
  "navigator/typings.ts",
  "page/index.ts",
  "index.ts",
];

sharedFiles.forEach((file) => {
  copy(
    `${rootDir}/packages/enhance/src/${file}`,
    `${rootDir}/packages/skyline-enhance/src/${file}`,
  );
});
