import { debug, error, filter, info, warn } from "./logger.js";
import { join, parse, stringify } from "./query.js";

export { encode as encodeBase64, decode as decodeBase64 } from "base64-arraybuffer";
export * from "./env.js";
export * from "./emitter.js";
export * from "./error.js";
export * from "./type.js";
export * from "./utils.js";

// `logger` / `query` are published as namespace-like objects. They are assembled from explicit
// bindings instead of `export * as logger from "./logger.js"` on purpose: `export * as` is ES2020
// syntax, and downleveling it for the bundle's ES2018 target makes rolldown emit a separate
// `rolldown-runtime-*.js` chunk that `dist/index.js` imports relatively — breaking the single-file
// ESM convention (the published package only ships `dist/`).
// `logger` / `query` 以显式对象导出，避免 `export * as`（ES2020）降级后产生额外的 runtime chunk。
export const logger: {
  debug: typeof debug;
  error: typeof error;
  filter: typeof filter;
  info: typeof info;
  warn: typeof warn;
} = {
  debug,
  error,
  filter,
  info,
  warn,
};

export const query: {
  join: typeof join;
  parse: typeof parse;
  stringify: typeof stringify;
} = {
  join,
  parse,
  stringify,
};
