import type { UserConfig, CopyEntry } from "tsdown";
import { defineConfig } from "tsdown";

const isProduction = process.env.NODE_ENV === "production";

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
    platform = "neutral",
    dts = true,
    alwaysBundle = [],
    neverBundle = [],
    onlyBundle = false,
    treeshake = {},
    copy = [],
    publint = isProduction,
    ...rest
  }: TsdownOptions = {},
): UserConfig => {
  const files = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

  return defineConfig({
    entry: files.map((item) => `./src/${item}.ts`),
    format: ["cjs", "esm"],
    inputOptions: {
      resolve: {
        mainFields: ["module", "main"],
      },
    },
    outDir: "./dist",
    sourcemap: true,
    dts,
    minify: isProduction,
    target: "es2015",
    platform,
    treeshake,
    deps: {
      alwaysBundle,
      neverBundle,
      onlyBundle,
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
  });
};
