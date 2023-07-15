import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import type { ModuleFormat, RollupOptions, Plugin } from "rollup";

const isProduction = process.env["NODE_ENV"] === "production";

export interface RollupTypescriptOptions {
  dts?: boolean;
  external?: (RegExp | string)[];
  dtsExternal?: (RegExp | string)[];
  resolve?: boolean;
  copy?: (string | [string, string])[];
  output?: Record<string, unknown>;
  inlineDynamicImports?: boolean;
  preserveShebang?: boolean;
}

export const rollupTypescript = (
  filePath: string,
  {
    external = [],
    dtsExternal = [],
    resolve = false,
    inlineDynamicImports = true,
  }: RollupTypescriptOptions = {},
): RollupOptions[] => [
  {
    input: `./src/${filePath}.ts`,
    output: [
      {
        file: `./lib/${filePath}.js`,
        format: "cjs",
        sourcemap: true,
        exports: "named",
        inlineDynamicImports,
      },
      {
        file: `./lib/${filePath}.mjs`,
        format: "esm",
        sourcemap: true,
        exports: "named",
        inlineDynamicImports,
      },
    ],
    plugins: [
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...(resolve ? [nodeResolve(), commonjs() as Plugin] : []),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      esbuild({ charset: "utf8", minify: isProduction, target: "es2015" }),
    ],
    external,
    treeshake: {
      unknownGlobalSideEffects: false,
    },
  },
  {
    input: `./src/${filePath}.ts`,
    output: [
      { file: `./lib/${filePath}.d.ts`, format: "esm" as ModuleFormat },
      { file: `./lib/${filePath}.d.mts`, format: "esm" as ModuleFormat },
    ],
    plugins: [
      dts({
        compilerOptions: {
          preserveSymlinks: false,
        },
        respectExternal: true,
      }),
    ],
    external: dtsExternal,
  },
];
