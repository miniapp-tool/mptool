// The `wx` object is assembled (and instrumented with the rule injector) in `wx.ts`; importing
// this module installs `globalThis.wx` and the mini-program framework mocks as a side effect.
export { frameworkApi } from "./framework.js";
export { mockWx } from "./mockWx.js";
export type { MockWx } from "./mockWx.js";
export { emitEvent } from "./ui.js";
export { wx } from "./wx.js";
export type * from "./typings.js";
