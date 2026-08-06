/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as api from "../../api/src/index.js";
/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as file from "../../file/src/index.js";
/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as net from "../../net/src/index.js";
/* oxlint-disable-next-line import/no-namespace -- aggregate every export into the global namespace */
import * as parser from "../../parser/src/index.js";

/**
 * Aggregated library namespace for `globalThis.mptool`, so hot-reload code can access the
 * api/file/net/parser helpers through the global object.
 *
 * `globalThis.mptool` 的聚合命名空间，热更新代码可通过全局对象访问 api/file/net/parser 工具。
 */
export const mptoolGlobals: Record<string, unknown> = {
  ...api,
  ...file,
  ...net,
  ...parser,
};

/**
 * Mount the `mptool` namespace onto the host global object (`globalThis.mptool`, non-enumerable).
 *
 * 将 `mptool` 命名空间挂载到宿主全局对象（`globalThis.mptool`，不可枚举）。
 *
 * Call this manually (e.g. in `app.js`) when you need hot-reload code to access the api/file/net
 * helpers through the global object.
 *
 * 需要热更新代码通过全局对象访问 api/file/net 工具时，请手动调用（例如在 `app.js` 中）。
 */
export const installMptoolGlobals = (): void => {
  if (typeof globalThis !== "undefined") {
    Object.defineProperty(globalThis, "mptool", {
      value: mptoolGlobals,
      configurable: true,
      writable: true,
    });
  }
};
