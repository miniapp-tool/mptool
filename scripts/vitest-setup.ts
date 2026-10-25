import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

/**
 * 测试通过包名导入 workspace 包（例如 `@mptool/mock`、`@mptool/run`）， 这些导入会按各包 `exports` 字段解析到 `dist/`。
 *
 * 干净 checkout 上 `pnpm test` 之前没有 `dist/`，测试会以难以理解的模块解析错误失败。 这里在缺产物时自动执行一次与 CI 相同的 `pnpm run
 * build`，让测试脚本自包含； CI 与本地正常工作流中 `dist/` 已存在，因此这是一次快速的存在性检查。
 */
const requiredFiles = readdirSync(path.join(rootDir, "packages")).flatMap((packageName) => [
  path.join(rootDir, "packages", packageName, "dist", "index.js"),
  path.join(rootDir, "packages", packageName, "dist", "index.d.ts"),
]);

const findMissing = (): string[] => requiredFiles.filter((file) => !existsSync(file));

const setup = (): void => {
  const missing = findMissing();

  if (missing.length === 0) return;

  console.log(
    `[vitest] ${missing.length} workspace package output(s) missing, running \`pnpm run build\` first.`,
  );

  const result = spawnSync("pnpm", ["run", "build"], {
    cwd: rootDir,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0)
    throw new Error("`pnpm run build` failed; tests import the built workspace packages.");

  const stillMissing = findMissing();

  if (stillMissing.length > 0) {
    throw new Error(
      `\`pnpm run build\` did not produce the expected output:\n${stillMissing.join("\n")}`,
    );
  }
};

export default setup;
