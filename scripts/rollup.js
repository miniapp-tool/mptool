import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { terser } from "rollup-plugin-terser";

const isProduction = process.env.mode === "production";

export const rollupTypescript = (
  filePath,
  {
    external = [],
    dtsExternal = [],
    resolve = false,
    tsconfig = {},
    inlineDynamicImports = true,
  } = {}
) => [
  {
    input: `./src/${filePath}.ts`,
    output: [
      {
        file: `./lib/${filePath}.js`,
        format: "cjs",
        sourcemap: true,
        exports: "named",
        plugins: [
          ...(isProduction ? [terser({ format: { comments: false } })] : []),
        ],
      },
      {
        file: `./lib/${filePath}.mjs`,
        format: "esm",
        sourcemap: true,
        exports: "named",
        plugins: [
          ...(isProduction ? [terser({ format: { comments: false } })] : []),
        ],
      },
    ],
    plugins: [
      typescript(tsconfig),
      ...(resolve ? [nodeResolve(), commonjs()] : []),
    ],
    inlineDynamicImports,
    external,
  },
  {
    input: `./src/${filePath}.ts`,
    output: [{ file: `./lib/${filePath}.d.ts`, format: "esm" }],
    plugins: [dts({ respectExternal: true })],
    external: dtsExternal,
  },
];
