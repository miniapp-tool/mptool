export { Emitter } from "@mptool/shared";
export { $App } from "./app/index.js";
export { go, reLaunch, redirect, switchTab } from "./bridge.js";
export { $Config } from "./config/index.js";
export { $Component } from "./component/index.js";
export { userEmitter as emitter } from "./emitter/index.js";
export {
  HOT_RELOAD_FUNCTION_KEY,
  HOT_RELOAD_ON_READY_KEY,
  applyHotReload,
  fetchHotReload,
  markHotReloadReady,
} from "./hotReload.js";
export { $Page } from "./page/index.js";

export type * from "./app/index.js";
export type * from "./config/index.js";
export type * from "./component/index.js";
export type * from "./page/index.js";
