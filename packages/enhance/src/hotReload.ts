/**
 * Page hot reload
 *
 * 页面热更新：从 `globalThis` 获取 `@mptool/run` 提供的 `createFunction`（由 `@mptool/all` 挂载），按 `$Config` 的
 * `hotReloadPattern` 拉取远程代码并执行，将返回的 `{ func }` 方法 对象合并到页面实例上。
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

/** Parsed hot-reload method objects, cached per page name / 已解析的热更新方法对象，按页面名缓存 */
const hotReloadCache = new Map<string, Record<string, unknown>>();

/** Page instances waiting for a hot reload to resolve, per page name / 等待热更新就绪的页面实例 */
const pendingInstances = new Map<string, Set<object>>();

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
    Object.assign(instance, func);
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
 * Fetch and parse the hot-reload code for a page (async, non-blocking).
 *
 * 拉取并解析页面热更新代码（异步，非阻塞）。
 *
 * The server code is expected to be a function body returning `{ func: { ...methods } }` — or any
 * object whose own properties are methods. Failures are silent.
 *
 * 服务端代码应为返回 `{ func: { ...methods } }` 的函数体——或任何以对象属性承载方法的对象。失败静默。
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

        // support `{ func: { ... } }` or a plain method object
        // 支持 `{ func: { ... } }` 或直接返回方法对象
        const func =
          result != null &&
          typeof result === "object" &&
          "func" in result &&
          result.func != null &&
          typeof result.func === "object"
            ? (result.func as Record<string, unknown>)
            : (result as Record<string, unknown>);

        if (func == null || typeof func !== "object") return;

        hotReloadCache.set(name, func);

        const instances = pendingInstances.get(name);

        if (instances) {
          instances.forEach((instance) => {
            Object.assign(instance, func);
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
