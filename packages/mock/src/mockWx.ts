// oxlint-disable promise/prefer-await-to-callbacks

import { getApiKind } from "./failure.js";
import { frameworkApi, normalizeRoute } from "./framework.js";
import {
  addRule,
  clearCalls,
  getCalls,
  mockState,
  nextRuleSeq,
  resetState,
  restoreState,
  snapshotState,
} from "./state.js";
import type { MockRule, RouteEntry } from "./state.js";
import { buildWifiInfo, getNetworkInfo } from "./systemInfo.js";
import { systemState } from "./systemState.js";
import type {
  MockCompatFlags,
  MockNetworkOptions,
  MockStorageOptions,
  MockIntersectionResult,
  MockNodeInfo,
  MockSystemOptions,
  MockUiState,
  MockWxScope,
  UserDecisions,
  WxApiKind,
  WxApiName,
  WxFailure,
  WxNetworkResponse,
  WxResponder,
  WxRuleHandle,
  WxRuleOptions,
} from "./typings.js";
import { emitEvent } from "./ui.js";
import { getUiState, uiDecisions } from "./uiState.js";
import { DEFAULT_USER_DATA_PATH, wx, wxApiWrappers } from "./wx.js";
import { registerNode, triggerIntersection } from "./wxmlState.js";

/** APIs whose failures can be injected. */
const FAILABLE_KINDS = new Set<WxApiKind>(["callback", "sync", "task"]);

/** APIs whose result can be replaced with `respond()`. */
const RESPONDABLE_KINDS = new Set<WxApiKind>(["callback", "manager", "sync", "task"]);

interface RuntimeSnapshot {
  /** Current value of every function-valued `wx` member. */
  apis: Map<string, unknown>;
  DEBUG: unknown;
  USER_DATA_PATH: string;
}

const snapshotRuntime = (): RuntimeSnapshot => ({
  apis: new Map(Object.entries(wx).filter(([, value]) => typeof value === "function")),
  DEBUG: (wx.env as unknown as Record<string, unknown>).DEBUG,
  USER_DATA_PATH: wx.env.USER_DATA_PATH,
});

const restoreRuntime = (snapshot: RuntimeSnapshot): void => {
  const target = wx as unknown as Record<string, unknown>;

  // Restore APIs replaced inside a scope (e.g. `wx.request = vi.fn()`), so a scope cannot leak
  // manual overrides into later tests. Direct assignment still wins outside a scope.
  for (const [api, value] of snapshot.apis) target[api] = value;

  wx.env.USER_DATA_PATH = snapshot.USER_DATA_PATH;

  const env = wx.env as unknown as Record<string, unknown>;

  // oxlint-disable-next-line no-undefined -- `DEBUG` is optional on `wx.env`
  if (snapshot.DEBUG === undefined) delete env.DEBUG;
  else env.DEBUG = snapshot.DEBUG;
};

const restoreApiWrappers = (): void => {
  const target = wx as unknown as Record<string, unknown>;

  for (const [api, value] of wxApiWrappers) target[api] = value;
};

const resetEnv = (): void => {
  wx.env.USER_DATA_PATH = DEFAULT_USER_DATA_PATH;

  delete (wx.env as unknown as Record<string, unknown>).DEBUG;
};

const createScope = (): MockWxScope => {
  const stateSnapshot = snapshotState();
  const runtimeSnapshot = snapshotRuntime();
  let restored = false;

  return {
    restore(): void {
      if (restored) return;

      restored = true;
      restoreState(stateSnapshot);
      restoreRuntime(runtimeSnapshot);
    },
  };
};

const runInScope = async <T>(callback: () => T | Promise<T>): Promise<T> => {
  const scope = createScope();

  try {
    return await callback();
  } finally {
    scope.restore();
  }
};

let autoRestoreInstalled = false;

const installAutoRestore = (afterEach: (hook: () => void) => void): void => {
  if (autoRestoreInstalled) return;

  autoRestoreInstalled = true;

  const stateSnapshot = snapshotState();
  const runtimeSnapshot = snapshotRuntime();

  afterEach(() => {
    restoreState(stateSnapshot);
    restoreRuntime(runtimeSnapshot);
  });
};

const normalizeApis = (api: WxApiName | WxApiName[]): WxApiName[] =>
  Array.isArray(api) ? api : [api];

const assertInjectable = (api: WxApiName, mode: "fail" | "respond"): void => {
  const value = (wx as unknown as Record<string, unknown>)[api];

  if (typeof value !== "function") throw new TypeError(`[mockWx] unknown wx API "${api}"`);

  const kind = getApiKind(api);
  const supported = mode === "respond" ? RESPONDABLE_KINDS : FAILABLE_KINDS;

  if (!supported.has(kind)) {
    throw new TypeError(
      mode === "respond"
        ? `[mockWx] "${api}" is an ${kind} API; respond() supports callback / task / sync / manager APIs`
        : `[mockWx] "${api}" is an ${kind} API; failures can only be injected into callback / task / sync APIs`,
    );
  }
};

interface RuleInput {
  api: string;
  kind: MockRule["kind"];
  remaining: number;
  delay: number;
  match?: (arg: unknown, callIndex: number) => boolean;
  failure?: WxFailure;
  failures?: WxFailure[];
  responder?: WxResponder;
  routes?: RouteEntry[];
}

const createRule = (input: RuleInput): MockRule => {
  const seq = nextRuleSeq();

  return {
    api: input.api,
    apiKind: getApiKind(input.api),
    count: 0,
    delay: input.delay,
    disposed: false,
    failure: input.failure,
    failures: input.failures,
    id: `rule-${seq}`,
    kind: input.kind,
    match: input.match,
    remaining: input.remaining,
    responder: input.responder,
    // Only `route()` rules carry a table; the empty list keeps the field always present.
    routes: input.routes ?? [],
    seq,
  };
};

const createHandle = (rules: MockRule[]): WxRuleHandle => ({
  get count(): number {
    return rules.reduce((total, rule) => total + rule.count, 0);
  },
  get id(): string {
    return rules.map((rule) => rule.id).join(",");
  },
  dispose(): void {
    for (const rule of rules) rule.disposed = true;
  },
});

const resolveRemaining = (options?: WxRuleOptions): number => {
  if (typeof options?.times === "number") {
    if (!Number.isInteger(options.times) || options.times < 1)
      throw new RangeError("[mockWx] options.times must be a positive integer");

    return options.once ? 1 : options.times;
  }

  return options?.once ? 1 : Number.POSITIVE_INFINITY;
};

const parseRouteKey = (
  key: string,
  response: WxResponder<WxNetworkResponse> | WxFailure,
): RouteEntry => {
  const trimmed = key.trim();
  const methodMatch = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s+(.+)$/iu.exec(
    trimmed,
  );
  const method = methodMatch?.[1]?.toUpperCase();
  const target = (methodMatch?.[2] ?? trimmed).trim();

  // `/pattern/` or `/pattern/flags` keys are treated as regular expressions; URLs start with
  // `http`, so there is no ambiguity for the usual cases.
  const regexpMatch = /^\/(.*)\/([a-z]*)$/u.exec(target);

  if (regexpMatch)
    // `(.*)` always participates in the match, so the pattern is always a string.
    return { method, regexp: new RegExp(regexpMatch[1], regexpMatch[2]), response };

  return { method, response, url: target };
};

const registerFailure = (
  api: WxApiName | WxApiName[],
  failure: WxFailure,
  options?: WxRuleOptions,
): WxRuleHandle => {
  if (failure.type === "http") {
    throw new TypeError(
      "[mockWx] HTTP status codes are responses, not failures; use respond() or route() instead",
    );
  }

  const remaining = resolveRemaining(options);
  const rules = normalizeApis(api).map((name) => {
    assertInjectable(name, "fail");

    return createRule({
      api: name,
      delay: options?.delay ?? 0,
      failure,
      kind: "fail",
      match: options?.match,
      remaining,
    });
  });

  for (const rule of rules) addRule(rule);

  return createHandle(rules);
};

const ensureParentDir = (path: string): void => {
  const index = path.lastIndexOf("/");

  if (index > 0) wx.getFileSystemManager().mkdirSync(path.slice(0, index), true);
};

const toArrayBuffer = (data: Uint8Array): ArrayBuffer =>
  data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

/** MockWx control plane; see the "Failing requests and injecting responses" section of the docs. */
export interface MockWx {
  // ---- failure injection ----
  fail: (api: WxApiName | WxApiName[], failure: WxFailure, options?: WxRuleOptions) => WxRuleHandle;
  failNext: (
    api: WxApiName | WxApiName[],
    failure: WxFailure,
    options?: Omit<WxRuleOptions, "once" | "times">,
  ) => WxRuleHandle;
  failSequence: (
    api: WxApiName,
    failures: WxFailure[],
    options?: Omit<WxRuleOptions, "times">,
  ) => WxRuleHandle;

  // ---- response injection ----
  respond: <R>(
    api: WxApiName | WxApiName[],
    responder: WxResponder<R>,
    options?: WxRuleOptions,
  ) => WxRuleHandle;
  route: (
    table: Record<string, WxResponder<WxNetworkResponse> | WxFailure>,
    options?: { delay?: number },
  ) => WxRuleHandle;

  // ---- state presets (consumed by the follow-up PRs) ----
  storage: (options: MockStorageOptions) => void;
  auth: (authSetting: Record<string, boolean>) => void;
  authorize: (decision: "allow" | "deny") => void;
  user: (decisions: UserDecisions) => void;
  system: (options: MockSystemOptions) => void;
  network: (options: MockNetworkOptions) => void;
  clipboard: (text: string) => void;
  pages: (pages: unknown[]) => void;
  /** Configure which routes are tabBar pages (kept alive across `switchTab`). */
  tabBar: (pages: string[]) => void;
  login: (state: { code?: string; sessionValid?: boolean }) => void;
  file: (path: string, content: string | ArrayBuffer | Uint8Array) => void;
  dir: (path: string) => void;

  // ---- call recording ----
  calls: (api: WxApiName) => readonly (readonly unknown[])[];
  clearCalls: (api?: WxApiName) => void;

  /** Read-only UI state (toast / loading / modal / update manager). */
  ui: () => MockUiState;

  /** Trigger `onError` with the given message. */
  error: (message: string) => void;
  /** Trigger `onUnhandledRejection`; `promise` defaults to a resolved promise. */
  unhandledRejection: (reason: string, promise?: Promise<unknown>) => void;
  /** Trigger `onMemoryWarning` (default level 10). */
  memoryWarning: (level?: 5 | 10 | 15) => void;

  /** Register a SelectorQuery node fixture; `null` clears the selector. */
  node: (selector: string, info: MockNodeInfo | null) => void;
  /** Trigger the IntersectionObservers watching `selector`. */
  intersection: (selector: string, result?: Partial<MockIntersectionResult>) => void;

  // ---- isolation ----
  scope: () => MockWxScope;
  run: <T>(callback: () => T | Promise<T>) => Promise<T>;
  autoRestore: (afterEach: (hook: () => void) => void) => void;
  reset: () => void;
  compat: (flags: MockCompatFlags) => void;

  /** Trigger an event registered through `wx.onXxx`. */
  emit: (event: string, ...args: unknown[]) => void;
}

export const mockWx: MockWx = {
  auth(authSetting: Record<string, boolean>): void {
    mockState.config.auth = { ...mockState.config.auth, ...authSetting };
    uiDecisions.auth = { ...uiDecisions.auth, ...authSetting };
  },

  authorize(decision: "allow" | "deny"): void {
    mockState.config.authorize = decision;
    uiDecisions.authorize = decision;
  },

  autoRestore(afterEach: (hook: () => void) => void): void {
    installAutoRestore(afterEach);
  },

  calls(api: WxApiName): readonly (readonly unknown[])[] {
    return getCalls(api);
  },

  clearCalls(api?: WxApiName): void {
    clearCalls(api);
  },

  clipboard(text: string): void {
    mockState.config.clipboard = text;
    uiDecisions.clipboard = text;
  },

  compat(flags: MockCompatFlags): void {
    mockState.config.compat = { ...mockState.config.compat, ...flags };
  },

  dir(path: string): void {
    wx.getFileSystemManager().mkdirSync(path, true);
  },

  emit(event: string, ...args: unknown[]): void {
    emitEvent(event, ...args);
  },

  fail(api: WxApiName | WxApiName[], failure: WxFailure, options?: WxRuleOptions): WxRuleHandle {
    return registerFailure(api, failure, options);
  },

  failNext(
    api: WxApiName | WxApiName[],
    failure: WxFailure,
    options?: Omit<WxRuleOptions, "once" | "times">,
  ): WxRuleHandle {
    return registerFailure(api, failure, { ...options, times: 1 });
  },

  failSequence(
    api: WxApiName,
    failures: WxFailure[],
    options?: Omit<WxRuleOptions, "times">,
  ): WxRuleHandle {
    if (failures.length === 0)
      throw new RangeError("[mockWx] failSequence() needs at least one failure");

    assertInjectable(api, "fail");

    const rule = createRule({
      api,
      delay: options?.delay ?? 0,
      failures,
      kind: "sequence",
      match: options?.match,
      remaining: Math.min(failures.length, resolveRemaining(options)),
    });

    addRule(rule);

    return createHandle([rule]);
  },

  file(path: string, content: string | ArrayBuffer | Uint8Array): void {
    ensureParentDir(path);

    wx.getFileSystemManager().writeFileSync(
      path,
      content instanceof Uint8Array ? toArrayBuffer(content) : content,
    );
  },

  login(state: { code?: string; sessionValid?: boolean }): void {
    mockState.config.login = { ...mockState.config.login, ...state };
    uiDecisions.login = { ...uiDecisions.login, ...state };
  },

  network(options: MockNetworkOptions): void {
    const previous = getNetworkInfo();

    mockState.config.network = { ...mockState.config.network, ...options };
    systemState.network = { ...systemState.network, ...options };

    const next = getNetworkInfo();

    if (previous.isConnected !== next.isConnected || previous.networkType !== next.networkType) {
      emitEvent("networkStatusChange", {
        isConnected: next.isConnected,
        networkType: next.networkType,
      });
    }

    if (next.networkType === "wifi" && previous.networkType !== "wifi")
      emitEvent("wifiConnected", { wifi: buildWifiInfo() });

    if (previous.weakNet !== next.weakNet) {
      emitEvent("networkWeakChange", {
        networkType: next.networkType,
        weakNet: next.weakNet,
      });
    }
  },

  pages(pages: unknown[]): void {
    frameworkApi.currentPages.length = 0;
    frameworkApi.currentPages.push(...pages);
  },

  tabBar(pages: string[]): void {
    frameworkApi.tabBarPages = pages.map((page) => normalizeRoute(page));
    frameworkApi.tabPages.clear();
  },

  reset(): void {
    resetState();
    resetEnv();
    restoreApiWrappers();
  },

  respond<R>(
    api: WxApiName | WxApiName[],
    responder: WxResponder<R>,
    options?: WxRuleOptions,
  ): WxRuleHandle {
    const remaining = resolveRemaining(options);
    const rules = normalizeApis(api).map((name) => {
      assertInjectable(name, "respond");

      return createRule({
        api: name,
        delay: options?.delay ?? 0,
        kind: "respond",
        match: options?.match,
        remaining,
        responder,
      });
    });

    for (const rule of rules) addRule(rule);

    return createHandle(rules);
  },

  route(
    table: Record<string, WxResponder<WxNetworkResponse> | WxFailure>,
    options?: { delay?: number },
  ): WxRuleHandle {
    assertInjectable("request", "respond");

    const routes = Object.entries(table).map(([key, response]) => parseRouteKey(key, response));

    if (routes.length === 0) throw new RangeError("[mockWx] route() needs at least one entry");

    const rule = createRule({
      api: "request",
      delay: options?.delay ?? 0,
      kind: "route",
      remaining: Number.POSITIVE_INFINITY,
      routes,
    });

    addRule(rule);

    return createHandle([rule]);
  },

  run: <T>(callback: () => T | Promise<T>): Promise<T> => runInScope(callback),

  scope(): MockWxScope {
    return createScope();
  },

  storage(options: MockStorageOptions): void {
    mockState.config.storage = { ...mockState.config.storage, ...options };
  },

  system(options: MockSystemOptions): void {
    mockState.config.system = { ...mockState.config.system, ...options };
    systemState.system = { ...systemState.system, ...options };

    if (options.userDataPath) wx.env.USER_DATA_PATH = options.userDataPath;
  },

  user(decisions: UserDecisions): void {
    mockState.config.user = { ...mockState.config.user, ...decisions };
    uiDecisions.user = { ...uiDecisions.user, ...decisions };
  },

  ui(): MockUiState {
    return getUiState();
  },

  error(message: string): void {
    emitEvent("error", message);
  },

  memoryWarning(level: 5 | 10 | 15 = 10): void {
    emitEvent("memoryWarning", { level });
  },

  unhandledRejection(reason: string, promise?: Promise<unknown>): void {
    emitEvent("unhandledRejection", { promise: promise ?? Promise.resolve(), reason });
  },

  node(selector: string, info: MockNodeInfo | null): void {
    registerNode(selector, info);
  },

  intersection(selector: string, result?: Partial<MockIntersectionResult>): void {
    triggerIntersection(selector, result);
  },
};
