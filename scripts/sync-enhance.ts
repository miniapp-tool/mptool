import { readFileSync } from "node:fs";
import path from "node:path";

import { copy } from "./copy.js";

const rootDir = path.resolve(import.meta.dirname, "..");

/** `--check` only verifies that the copies are up to date instead of writing them. */
const checkOnly = process.argv.includes("--check");

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

const readIfExists = (file: string): string | null => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
};

const drifted: string[] = [];

for (const file of sharedFiles) {
  const source = `${rootDir}/packages/enhance/src/${file}`;
  const target = `${rootDir}/packages/skyline-enhance/src/${file}`;

  if (checkOnly) {
    if (readIfExists(target) !== readFileSync(source, "utf8")) drifted.push(file);
  } else {
    copy(source, target);
  }
}

if (drifted.length > 0) {
  console.error(
    "packages/skyline-enhance/src is out of sync with packages/enhance/src.\n" +
      "Edit the shared files in packages/enhance/src only, then run `pnpm run sync`.\n" +
      "Drifted files:",
  );
  drifted.forEach((file) => {
    console.error(`  - packages/skyline-enhance/src/${file}`);
  });
  process.exitCode = 1;
}
