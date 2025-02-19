import { basename } from "node:path";
import { cwd } from "node:process";

import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import type { Plugin, RollupOptions } from "rollup";
import { defineConfig } from "rollup";
import { dts } from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

const isProduction = process.env.NODE_ENV === "production";

export interface RollupTypescriptOptions {
  dts?: boolean;
  external?: (RegExp | string)[];
  dtsExternal?: (RegExp | string)[];
  resolve?: boolean;
  copy?: (string | [string, string])[];
  output?: Record<string, unknown>;
  inlineDynamicImports?: boolean;
}

export const rollupTypescript = (
  filePath: string,
  {
    external = [],
    dtsExternal = [],
    resolve = false,
    inlineDynamicImports = true,
  }: RollupTypescriptOptions = {},
): RollupOptions[] =>
  defineConfig([
    {
      input: `./src/${filePath}.ts`,
      output: [
        {
          file: `./dist/${filePath}.js`,
          format: "cjs",
          sourcemap: true,
          exports: "named",
          inlineDynamicImports,
        },
        {
          file: `./dist/${filePath}.mjs`,
          format: "esm",
          sourcemap: true,
          exports: "named",
          inlineDynamicImports,
        },
      ],
      plugins: [
        // @ts-expect-error: type issue with NodeNext
        ...(resolve ? [nodeResolve(), commonjs() as Plugin] : []),
        esbuild({ charset: "utf8", minify: isProduction, target: "es2015" }),
        codecovRollupPlugin({
          enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
          bundleName: basename(cwd()),
          uploadToken: process.env.CODECOV_TOKEN,
        }),
      ],
      external,
      treeshake: {
        preset: "smallest",
        unknownGlobalSideEffects: false,
      },
    },
    {
      input: `./src/${filePath}.ts`,
      output: [
        { file: `./dist/${filePath}.d.ts`, format: "esm" },
        { file: `./dist/${filePath}.d.mts`, format: "esm" },
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
      treeshake: {
        preset: "smallest",
      },
    },
  ]);
