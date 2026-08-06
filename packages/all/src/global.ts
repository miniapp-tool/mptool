/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as api from "../../api/src/index.js";
/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as file from "../../file/src/index.js";
/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as net from "../../net/src/index.js";
/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as parser from "../../parser/src/index.js";

/**
 * Aggregated library namespace mounted on `globalThis.mptool`, so hot-reload code can access the
 * api/file/net/parser helpers through the global object.
 *
 * 挂载到 `globalThis.mptool` 的聚合命名空间，热更新代码可通过全局对象访问 api/file/net/parser 工具。
 */
export const mptoolGlobals: Record<string, unknown> = {
  ...api,
  ...file,
  ...net,
  ...parser,
};

// Automatically mount the `mptool` namespace onto the host global object (non-enumerable to avoid
// polluting enumeration).
// 自动将 `mptool` 命名空间挂载到宿主全局对象（不可枚举，避免污染枚举）。
if (typeof globalThis !== "undefined") {
  Object.defineProperty(globalThis, "mptool", {
    value: mptoolGlobals,
    configurable: true,
    writable: true,
  });
}
