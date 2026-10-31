import { readFileSync } from "node:fs";
import path from "node:path";

import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import type { UserConfig, CopyEntry } from "tsdown";
import { defineConfig } from "tsdown";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Polyfill prepended to every JavaScript bundle: `Object.hasOwn` is ES2022 and missing on the
 * minimum supported runtime (base library 3.8.2 ≈ Chrome 86 / iOS 14), while `dom-serializer`
 * (bundled into parser / all / skyline) calls it unconditionally.
 *
 * 所有 JS 产物顶部注入的 `Object.hasOwn` 兜底（最低支持的基础库环境没有该 ES2022 API）。
 */
const hasOwnPolyfill = [
  'if (typeof Object.hasOwn !== "function")',
  "  Object.hasOwn = function (target, key) {",
  "    return Object.prototype.hasOwnProperty.call(target, key);",
  "  };",
].join("\n");
const __dirname = import.meta.dirname;

/**
 * Package name used as the Codecov bundle name.
 *
 * The tsdown config is loaded from each package directory (pnpm runs `build` there), so the nearest
 * `package.json` is the package being built.
 *
 * @returns Package name / 包名
 */
const getPackageName = (): string => {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJsonContent = readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent) as { name?: string };

    if (packageJson.name) return packageJson.name;
  } catch {
    // fall back to the pnpm-provided name below
  }

  return process.env.npm_package_name ?? "unknown";
};

/**
 * Tsdown options
 *
 * Tsdown 选项
 */
export interface TsdownOptions extends Omit<UserConfig, "entry" | "copy"> {
  /**
   * Whitelist of dependencies allowed to be bundled
   *
   * 允许被打包的依赖白名单
   *
   * @default false
   */
  onlyBundle?: (string | RegExp)[] | false;

  /**
   * Packages to always bundle
   *
   * 永远打包的包
   */
  alwaysBundle?: (string | RegExp)[];

  /**
   * Global variable names for external dependencies in UMD bundles
   *
   * UMD 包中外部依赖的全局变量名
   *
   * 例如：
   *
   * ```js
   * globals: {
   *   "markdown-it": "markdownit",
   * }
   * ```
   */
  globals?: Record<string, string>;

  /**
   * Assets to never bundle
   *
   * 永远不打包的资源
   *
   * Modules starting with `@temp/`, `@internal/` are never bundled.
   */
  neverBundle?: (string | RegExp)[];

  /**
   * Additional files to copy to the output directory
   *
   * 要复制到输出目录的额外文件
   *
   * Each item is either a string (source path relative to src) or an copy entry object
   */
  copy?: (string | CopyEntry)[];
}

/**
 * Create tsdown configuration
 *
 * 创建 tsdown 配置
 *
 * @param fileInfo - Entry file(s) without extension, relative to src (e.g. "index" or ["index",
 *   "cli"])
 * @param options - Tsdown options / Tsdown 选项
 * @returns Tsdown configuration / Tsdown 配置
 */
export const tsdownConfig = (
  fileInfo: string | string[],
  {
    platform = "browser",
    dts = {
      generator: "oxc",
    },
    alwaysBundle = [],
    neverBundle = [],
    onlyBundle = false,
    treeshake = {
      moduleSideEffects: false,
    },
    copy = [],
    publint = isProduction,
    ...rest
  }: TsdownOptions = {},
): UserConfig => {
  const files = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

  return defineConfig({
    entry: files.map((item) => `./src/${item}.ts`),
    format: "esm",
    sourcemap: true,
    dts,
    minify: isProduction,
    // The lowest supported base library version is 3.8.2, which maps to
    // iOS 14 / Chrome 86. Verified in WeChat DevTools that ES2020 optional
    // chaining / nullish coalescing (`?.`/`??`) fails to parse on upload
    // (SyntaxError: Unexpected token ?), so the target cannot exceed es2019.
    // es2018 is chosen: it keeps object rest/spread native (the main ~1.2KB
    // saving over es2017) while es2019 would only save ~12B more while
    // introducing an extra syntax (`catch {}`).
    target: "es2018",
    platform,
    treeshake,
    // The published packages are single-file ESM bundles. Without this, rolldown may hoist shared
    // runtime helpers into an extra `rolldown-runtime-*.js` chunk and make `dist/index.js` import
    // it relatively, which breaks the one-file convention (e.g. `@mptool/shared` did).
    // 各包发布为单文件 ESM 产物；关闭代码分割，避免 rolldown 额外生成相对导入的 runtime chunk。
    outputOptions: {
      codeSplitting: false,
    },
    // `Object.hasOwn` is ES2022 (Chrome 93 / iOS 15.4) but the minimum supported base library 3.8.2
    // maps to Chrome 86 / iOS 14. `dom-serializer` (bundled into `@mptool/parser`, `@mptool/all` and
    // `@mptool/skyline`) calls it directly, so inject a tiny guard at the top of every JS bundle.
    // The banner must be limited to `.js` output: tsdown also renders `dist/index.d.ts` through the
    // same chunk addon hook, and a statement inside a declaration file fails `tsc` for consumers.
    // `Object.hasOwn` 是 ES2022 API，低于最低基础库对应的 Chrome 86 / iOS 14 没有，故在 JS 产物顶部注入兜底；
    // 不能注入 `.d.ts`（声明文件里出现语句会导致下游 `tsc` 报错）。
    banner: ({ fileName }) => (fileName.endsWith(".js") ? hasOwnPolyfill : ""),
    deps: {
      alwaysBundle,
      neverBundle,
      onlyBundle,
    },
    inputOptions: {
      transform: {
        inject: {
          // `entities` (htmlparser2 dependency) uses the global `atob` to decode
          // its entity tables, which does not exist in miniapp environments.
          atob: [path.resolve(__dirname, "./atob.ts"), "atob"],
        },
      },
    },
    copy: copy.map((item) => {
      if (typeof item === "string") {
        return {
          from: `./src/${item}`,
          flatten: false,
        };
      }

      return item;
    }),
    publint,
    ...rest,
    plugins: [
      ...(Array.isArray(rest.plugins) ? rest.plugins : []),
      // Bundle analysis uploads are opt-in through `BUNDLE_ANALYSIS`, which CI sets when building.
      codecovRollupPlugin({
        enableBundleAnalysis: Boolean(process.env.BUNDLE_ANALYSIS),
        bundleName: getPackageName(),
        oidc: {
          useGitHubOIDC: true,
        },
        telemetry: false,
      }),
    ],
  });
};
