import { wrapFunction } from "@mptool/shared";

import { getConfig } from "./config/index.js";

/**
 * Page hot reload
 *
 * 页面热更新：从 `globalThis` 获取 `@mptool/run` 提供的 `createFunction`（由 `@mptool/run` 的 `installGlobal()`
 * 挂载）， 按 `$Config` 的 `hotReloadPattern` 拉取远程代码并执行，将返回的方法对象合并到页面实例上。
 *
 * The hot reload is best-effort: it never blocks page registration or loading. If the remote code
 * is not ready when a page loads, the instance is registered and the methods are applied as soon as
 * the fetch resolves.
 *
 * 热更新是尽力而为的：不阻塞页面注册与加载。若页面加载时远程代码尚未就绪，实例会被登记，拉取完成后立即补挂方法。
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

/**
 * Page names whose hot-reload fetch finished without usable methods (missing `createFunction`,
 * empty/non-200 response, invalid payload, parse error or network failure). Instances registered
 * afterwards must not be kept in `pendingInstances`, they can never be patched.
 *
 * 已确定没有可用热更新的页面名（未挂载 createFunction、空/非 200 响应、非法载荷、解析失败或网络失败）。
 */
const unavailableHotReload = new Set<string>();

/** Page names whose hot-reload fetch is currently in flight / 正在拉取热更新的页面名 */
const inFlightHotReload = new Set<string>();

/** Pending fetch timeout timers, keyed by page name / 每个页面热更新拉取的超时定时器 */
const hotReloadTimeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Default timeout (ms) for a hot-reload fetch / 热更新拉取的默认超时时间（ms） */
const DEFAULT_HOT_RELOAD_TIMEOUT = 10_000;

/**
 * Number of page instances still waiting for a hot reload.
 *
 * Exported for diagnostics and tests: an instance that waits forever is a memory leak.
 *
 * 仍在等待热更新的页面实例数量（诊断与测试用；数量只增不减说明存在泄漏）。
 *
 * @returns Pending page instance count / 等待中的页面实例数量
 * @internal
 */
export const getPendingHotReloadCount = (): number => {
  let count = 0;

  for (const instances of pendingInstances.values()) count += instances.size;

  return count;
};

/**
 * Mark a page as having no usable hot reload, and release its waiting instances.
 *
 * 标记页面没有可用的热更新，并释放等待中的页面实例。
 *
 * @param name - Page name / 页面名称
 */
const markHotReloadUnavailable = (name: string): void => {
  pendingInstances.delete(name);
  unavailableHotReload.add(name);
};

/**
 * Mark a hot-reload fetch as settled: clear its timeout timer and in-flight marker.
 *
 * Returns `false` when the fetch had already settled, so a late response arriving after the timeout
 * is ignored instead of patching pages with stale code.
 *
 * 标记热更新拉取已结束：清理超时定时器与在途标记。已结束（如超时后才到达的响应）时返回 `false`， 避免用过期代码补挂页面。
 *
 * @param name - Page name / 页面名称
 * @returns Whether this call settled the fetch / 本次调用是否真正结束了拉取
 */
const settleHotReload = (name: string): boolean => {
  if (!inFlightHotReload.delete(name)) return false;

  const timer = hotReloadTimeoutTimers.get(name);

  // The timeout timer is armed together with the in-flight marker and the two are only dropped by
  // this function or `clearHotReloadCache`, so a settled fetch always still has its timer here. The
  // guard stays because `clearTimeout` is typed to take a timer id, not `undefined`.
  // 超时定时器与在途标记同时登记，且只会被本函数或 `clearHotReloadCache` 清理，因此此处定时器必定存在。
  // 保留判断仅因为 `clearTimeout` 的类型不接受 `undefined`，删掉它需要非空断言。
  /* istanbul ignore else */
  if (timer != null) {
    clearTimeout(timer);
    hotReloadTimeoutTimers.delete(name);
  }

  return true;
};

/**
 * Clear cached hot-reload methods so a later registration (or an explicit `fetchHotReload` call)
 * fetches the code again — e.g. after deploying new hot-reload code (OTA).
 *
 * 清除热更新缓存，使后续页面注册（或手动调用 `fetchHotReload`）重新拉取，例如 OTA 部署新代码后。
 *
 * @param name - Page name, or omit to clear every page / 页面名称；省略时清除所有页面
 */
export const clearHotReloadCache = (name?: string): void => {
  if (name == null) {
    hotReloadCache.clear();
    unavailableHotReload.clear();
    pendingInstances.clear();
    inFlightHotReload.clear();

    for (const timer of hotReloadTimeoutTimers.values()) clearTimeout(timer);
    hotReloadTimeoutTimers.clear();

    return;
  }

  hotReloadCache.delete(name);
  unavailableHotReload.delete(name);
  pendingInstances.delete(name);
  inFlightHotReload.delete(name);

  const timer = hotReloadTimeoutTimers.get(name);

  if (timer != null) {
    clearTimeout(timer);
    hotReloadTimeoutTimers.delete(name);
  }
};

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
  options?: {
    global?: boolean;
    maxSteps?: number;
    maxStack?: number;
    maxSourceLength?: number;
  },
) => (...args: unknown[]) => unknown;

/**
 * Execution budgets for remote hot-reload code.
 *
 * Remote code is bounded even though it is considered trusted: a buggy payload must not block the
 * page lifecycle forever, recurse without limit or make parsing unbounded.
 *
 * 远程热更新代码的执行预算。即使代码可信也要限制：有 bug 的载荷不应永久阻塞页面生命周期、无限递归或让解析无界。
 */
const HOT_RELOAD_RUN_OPTIONS = {
  global: true,
  maxSteps: 200_000,
  maxStack: 128,
  maxSourceLength: 512 * 1024,
} satisfies Parameters<CreateFunction>[2];

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
 * Page lifecycles that are wrapped by `$Page` for framework bookkeeping. A hot-reload method with
 * the same name must be chained after the framework hook instead of replacing it, otherwise the
 * page-ready / page-unload bookkeeping (navigation lock release, `onAwake` listener cleanup,
 * pending hot-reload instances) silently stops working.
 *
 * 由 `$Page` 包装用于框架簿记的页面生命周期。同名热更新方法必须串在框架钩子之后执行，而不是替换它， 否则页面 ready / unload 的簿记（导航锁释放、`onAwake`
 * 监听器解绑、等待热更新的实例登记）会失效。
 */
const FRAMEWORK_LIFECYCLE_KEYS: ReadonlySet<string> = new Set(["onLoad", "onReady", "onUnload"]);

/**
 * Merge the hot-reload method object onto a page instance, and auto-invoke its `onHotReload` hook:
 * immediately when the instance is already ready, or at `onReady` otherwise.
 *
 * 将热更新方法对象合并到页面实例，并自动触发 `onHotReload` 钩子：实例已 ready 时立即触发，否则在 onReady 时触发。
 *
 * Framework-wrapped lifecycles are composed (framework logic first, hot-reload method afterwards),
 * every other property keeps the plain overwrite semantics of `Object.assign`.
 *
 * 框架包装的生命周期采用组合语义（先执行框架逻辑，再执行热更新方法），其余属性保持 `Object.assign` 的覆盖语义。
 *
 * @param instance - Page instance / 页面实例
 * @param func - Hot-reload method object / 热更新方法对象
 */
const applyToInstance = (instance: object, func: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(func)) {
    const current = (instance as Record<string, unknown>)[key];

    if (
      FRAMEWORK_LIFECYCLE_KEYS.has(key) &&
      typeof current === "function" &&
      typeof value === "function"
    ) {
      // `wrapFunction(original, pre)` runs `pre` (the framework hook) first, then the hot-reload
      // method, keeping the same `this` and arguments.
      // `wrapFunction(original, pre)` 先执行 `pre`（框架钩子），再执行热更新方法，`this` 与参数保持一致。
      (instance as Record<string, unknown>)[key] = wrapFunction(
        value as (this: object, ...args: unknown[]) => void,
        function runFrameworkLifecycle(this: object, ...args: unknown[]): void {
          (current as (this: object, ...args: unknown[]) => void).apply(this, args);
        },
      );
    } else {
      (instance as Record<string, unknown>)[key] = value;
    }
  }

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
    return;
  }

  // The fetch already finished without usable methods (or `createFunction` is not mounted):
  // this instance can never be patched, holding it would leak the whole page instance.
  // 热更新已确定不可用：实例永远不会被补挂，登记会造成内存泄漏。
  if (unavailableHotReload.has(name)) return;

  let instances = pendingInstances.get(name);

  if (!instances) {
    instances = new Set();
    pendingInstances.set(name, instances);
  }
  instances.add(instance);
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
 * Drop a page instance from the hot-reload bookkeeping when the page unloads.
 *
 * A late fetch must not patch an unloaded page or fire its `onHotReload` hook, otherwise the hook
 * would run `setData` / business side effects on a closed page.
 *
 * 页面卸载时从热更新登记中移除实例：晚到的拉取不得补挂已卸载页面或触发其 onHotReload。
 *
 * @param instance - Page instance / 页面实例
 * @internal
 */
export const dropHotReloadInstance = (instance: object): void => {
  for (const [name, instances] of pendingInstances)
    if (instances.delete(instance) && instances.size === 0) pendingInstances.delete(name);

  readyInstances.delete(instance);
  pendingOnReadyInstances.delete(instance);
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

  // a page can be registered again (e.g. the module is evaluated twice): allow a retry
  // 页面可能被重新注册（例如模块被重新执行）：允许重试
  unavailableHotReload.delete(name);

  // already fetched for this page
  // 该页面已拉取过
  if (hotReloadCache.has(name)) return;

  // A fetch for this page is already in flight: registering the same page again (e.g. the module is
  // evaluated twice) must not send a duplicate request.
  // 同一页面的拉取已在途：重复注册同一页面（如模块被重复执行）时不要重复发请求。
  if (inFlightHotReload.has(name)) return;

  // No createFunction mounted: the code can never be executed, so no page instance should wait for
  // it. Without this the page instance registered in `onLoad` leaks forever.
  // 未挂载 createFunction：代码永远无法执行，不应让页面实例继续等待。
  if (!createFunction) {
    markHotReloadUnavailable(name);
    return;
  }

  inFlightHotReload.add(name);

  const timeout = getConfig().hotReloadTimeout ?? DEFAULT_HOT_RELOAD_TIMEOUT;

  hotReloadTimeoutTimers.set(
    name,
    setTimeout(() => {
      // Release the page instances waiting for this page: a fetch that never settles must not keep
      // them (and the whole page instance) alive forever.
      // 超时后释放等待中的页面实例，避免请求永不返回时页面实例泄漏。
      //
      // `settleHotReload` also clears this very timer, so in a single-threaded runtime the callback
      // can never observe an already settled fetch. The false path stays to guard against a runtime
      // that fires a cleared timer anyway: such a late timeout must not mark a cached page as
      // unavailable.
      // `settleHotReload` 会一并清除本定时器，单线程运行时下该回调不可能遇到已结束的拉取。false 分支
      // 用于防止运行时仍触发已清除的定时器：这种迟到的超时不得把已缓存的页面标记为不可用。
      /* istanbul ignore else */
      if (settleHotReload(name)) markHotReloadUnavailable(name);
    }, timeout),
  );

  wx.request({
    url: pattern.replace(/\$name/gu, name),
    timeout,
    success: ({ statusCode, data }) => {
      // Ignore a response that arrives after the timeout already settled this fetch.
      // 忽略超时结束后才到达的响应。
      if (!settleHotReload(name)) return;

      // in wx.request, `success` fires for any completed response regardless of the HTTP status
      // code, so the status code must be checked explicitly. When no hot-reload file exists, the
      // nginx config serves a 200 response with an empty body, so empty bodies are skipped too.
      // wx.request 中 `success` 表示请求已完成（无论 HTTP 状态码），需自行校验状态码；
      // nginx 对不存在的热更新文件返回 200 空响应体，因此空字符串同样跳过
      if (statusCode !== 200 || typeof data !== "string" || data.length === 0) {
        markHotReloadUnavailable(name);
        return;
      }

      try {
        const fn = createFunction([], data, HOT_RELOAD_RUN_OPTIONS);
        const result = fn();

        if (result == null || typeof result !== "object") {
          markHotReloadUnavailable(name);
          return;
        }

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
        markHotReloadUnavailable(name);
      }
    },
    fail: () => {
      if (!settleHotReload(name)) return;

      // silent: fetch failed, keep the page as-is, but do not keep page instances waiting
      // 静默：拉取失败，页面保持不变，但不再让页面实例继续等待
      markHotReloadUnavailable(name);
    },
  });
};
