/**
 * Page hot reload
 *
 * 页面热更新：从 `globalThis` 获取 `@mptool/run` 提供的 `createFunction`（由 `@mptool/all` 挂载），按 `$Config` 的
 * `hotReloadPattern` 拉取远程代码并执行，将返回的方法对象合并到页面实例上。
 *
 * The hot reload is best-effort: it never blocks page registration or loading. If the remote code
 * is not ready when a page loads, the instance is registered and the methods are applied as soon as
 * the fetch resolves.
 *
 * 热更新是尽力而为的：不阻塞页面注册与加载。若页面加载时远程代码尚未就绪，实例会被登记， 拉取完成后立即补挂方法。
 */

/**
 * Global key that the host `createFunction` is mounted on (`globalThis.createFunction`), shared
 * with `@mptool/run`'s `installGlobal`.
 *
 * 宿主 `createFunction` 挂载所用的全局键（`globalThis.createFunction`），与 `@mptool/run` 的 `installGlobal` 共享。
 */
export const HOT_RELOAD_FUNCTION_KEY = "createFunction";

/**
 * Method name in the hot-reload method object that is auto-invoked when the reload is applied:
 * right after the page `onReady` when applied earlier, or immediately when the page is already past
 * `onReady`. The page instance is used as `this`.
 *
 * 热更新方法对象中应用后自动触发的方法名：页面尚未 `onReady` 时于 `onReady` 后触发；应用时页面已过 `onReady` 则立即触发。以页面实例作为 `this`。
 */
export const HOT_RELOAD_ON_READY_KEY = "onHotReload";

/** Parsed hot-reload method objects, cached per page name / 已解析的热更新方法对象，按页面名缓存 */
const hotReloadCache = new Map<string, Record<string, unknown>>();

/** Page instances waiting for a hot reload to resolve, per page name / 等待热更新就绪的页面实例 */
const pendingInstances = new Map<string, Set<object>>();

/** Page instances that have fired `onReady` / 已触发 onReady 的页面实例 */
const readyInstances = new WeakSet<object>();

/**
 * Page instances that applied a hot reload and await `onReady` to fire their hook / 已应用热更新、等待
 * onReady 触发钩子的页面实例
 */
const pendingOnReadyInstances = new WeakSet<object>();

/** `createFunction` shape taken from `globalThis` / 从 globalThis 取得的 `createFunction` 形态 */
type CreateFunction = (
  args: string[],
  body: string,
  options?: { global?: boolean },
) => (...args: unknown[]) => unknown;

/**
 * Read `createFunction` from `globalThis`.
 *
 * 从 globalThis 读取 `createFunction`。
 *
 * @returns The createFunction, or `undefined` when not mounted / createFunction，未挂载时为 `undefined`
 */
const getCreateFunction = (): CreateFunction | undefined =>
  (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] as
    | CreateFunction
    | undefined;

/**
 * Invoke the `onHotReload` hook on an instance with the instance as `this`, swallowing errors so
 * the page lifecycle keeps running (hot reload is best-effort).
 *
 * 以实例作为 `this` 触发 `onHotReload` 钩子，并吞掉异常，保证页面生命周期不受影响（热更新尽力而为）。
 *
 * @param instance - Page instance / 页面实例
 */
const callOnHotReload = (instance: object): void => {
  const onHotReload = (instance as Record<string, unknown>)[HOT_RELOAD_ON_READY_KEY];

  if (typeof onHotReload !== "function") return;

  try {
    (onHotReload as () => void).call(instance);
  } catch {
    // silent: hook errors must not break the page lifecycle
    // 静默：钩子异常不得影响页面生命周期
  }
};

/**
 * Merge the hot-reload method object onto a page instance, and auto-invoke its `onHotReload` hook:
 * immediately when the instance is already ready, or at `onReady` otherwise.
 *
 * 将热更新方法对象合并到页面实例，并自动触发 `onHotReload` 钩子：实例已 ready 时立即触发，否则在 onReady 时触发。
 *
 * @param instance - Page instance / 页面实例
 * @param func - Hot-reload method object / 热更新方法对象
 */
const applyToInstance = (instance: object, func: Record<string, unknown>): void => {
  Object.assign(instance, func);

  const onHotReload = func[HOT_RELOAD_ON_READY_KEY];

  if (typeof onHotReload === "function") {
    if (readyInstances.has(instance)) callOnHotReload(instance);
    else pendingOnReadyInstances.add(instance);
  }
};

/**
 * Apply the cached hot-reload methods to a page instance. When not ready yet, the instance is
 * registered and patched once the fetch resolves.
 *
 * 将已缓存的热更新方法应用到页面实例；尚未就绪时登记实例，拉取完成后补挂。
 *
 * @param name - Page name / 页面名称
 * @param instance - Page instance / 页面实例
 */
export const applyHotReload = (name: string, instance: object): void => {
  const func = hotReloadCache.get(name);

  if (func) {
    applyToInstance(instance, func);
  } else {
    let instances = pendingInstances.get(name);

    if (!instances) {
      instances = new Set();
      pendingInstances.set(name, instances);
    }
    instances.add(instance);
  }
};

/**
 * Mark a page instance as `onReady` fired, and flush its pending hot-reload `onHotReload` hook.
 * Called by the page `onReady` wrapper.
 *
 * 标记页面实例已触发 onReady，并触发待执行的 `onHotReload` 钩子（由页面 onReady 包装调用）。
 *
 * @param instance - Page instance / 页面实例
 */
export const markHotReloadReady = (instance: object): void => {
  readyInstances.add(instance);

  if (pendingOnReadyInstances.delete(instance)) callOnHotReload(instance);
};

/**
 * Fetch and parse the hot-reload code for a page (async, non-blocking).
 *
 * 拉取并解析页面热更新代码（异步，非阻塞）。
 *
 * The server code is expected to be a function body returning a method object (whose own properties
 * are methods). Failures are silent.
 *
 * 服务端代码应为返回方法对象的函数体（对象属性即页面方法）。失败静默。
 *
 * @param name - Page name / 页面名称
 * @param pattern - URL template with a `$name` placeholder / 含 `$name` 占位符的地址模板
 */
export const fetchHotReload = (name: string, pattern: string): void => {
  const createFunction = getCreateFunction();

  // no createFunction mounted, or already fetched for this page
  // 未挂载 createFunction，或该页面已拉取过
  if (!createFunction || hotReloadCache.has(name)) return;

  wx.request({
    url: pattern.replace(/\$name/gu, name),
    success: ({ statusCode, data }) => {
      // in wx.request, `success` fires for any completed response regardless of the HTTP status
      // code, so the status code must be checked explicitly. When no hot-reload file exists, the
      // nginx config serves a 200 response with an empty body, so empty bodies are skipped too.
      // wx.request 中 `success` 表示请求已完成（无论 HTTP 状态码），需自行校验状态码；
      // nginx 对不存在的热更新文件返回 200 空响应体，因此空字符串同样跳过
      if (statusCode !== 200 || typeof data !== "string" || data.length === 0) return;

      try {
        const fn = createFunction([], data, { global: true });
        const result = fn();

        if (result == null || typeof result !== "object") return;

        const func = result as Record<string, unknown>;

        hotReloadCache.set(name, func);

        const instances = pendingInstances.get(name);

        if (instances) {
          instances.forEach((instance) => {
            applyToInstance(instance, func);
          });
          pendingInstances.delete(name);
        }
      } catch {
        // silent: parsing or execution failed, keep the page as-is
        // 静默：解析或执行失败，页面保持不变
      }
    },
    fail: () => {
      // silent: fetch failed, keep the page as-is
      // 静默：拉取失败，页面保持不变
    },
  });
};
