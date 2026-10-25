import { getFileSystemManager } from "./fileSystem.js";
import type { FileSystemSnapshot } from "./fileSystem.js";
import { frameworkApi } from "./framework.js";
import { resetStorage, restoreStorage, snapshotStorage } from "./storageState.js";
import type { StorageSnapshot } from "./storageState.js";
import type {
  MockCompatFlags,
  MockNetworkOptions,
  MockStorageOptions,
  MockSystemOptions,
  UserDecisions,
  WxApiKind,
  WxFailure,
  WxNetworkResponse,
  WxResponder,
} from "./typings.js";
import { clearEventListeners, restoreEventListeners, snapshotEventListeners } from "./ui.js";
import type { EventListenerSnapshot } from "./ui.js";
import { resetUi, restoreUi, snapshotUi } from "./uiState.js";
import type { UiSnapshot } from "./uiState.js";

/** One entry of a `mockWx.route()` table. */
export interface RouteEntry {
  method?: string;
  url?: string;
  regexp?: RegExp;
  response: WxResponder<WxNetworkResponse> | WxFailure;
}

/** Internal rule representation; never exposed directly. */
export interface MockRule {
  readonly id: string;
  readonly seq: number;
  readonly kind: "fail" | "sequence" | "respond" | "route";
  readonly api: string;
  readonly apiKind: WxApiKind;
  readonly delay: number;
  readonly match?: (arg: unknown, callIndex: number) => boolean;
  readonly failure?: WxFailure;
  readonly failures?: WxFailure[];
  readonly responder?: WxResponder;
  readonly routes?: RouteEntry[];
  remaining: number;
  count: number;
  disposed: boolean;
}

/** State pre-configured through `mockWx`; consumed by the follow-up PRs. */
export interface MockConfig {
  storage: MockStorageOptions;
  auth: Record<string, boolean>;
  authorize: "allow" | "deny";
  user: UserDecisions;
  system: MockSystemOptions;
  network: MockNetworkOptions;
  clipboard: string | null;
  login: { code?: string; sessionValid?: boolean };
  compat: MockCompatFlags;
}

/** One call consumed by a rule. */
export interface MatchedRule {
  rule: MockRule;
  failure?: WxFailure;
  responder?: WxResponder;
  route?: RouteEntry;
}

interface RuleSnapshot {
  rule: MockRule;
  remaining: number;
  count: number;
  disposed: boolean;
}

/** Snapshot of everything `scope()` / `autoRestore()` / `reset()` needs to restore. */
export interface MockStateSnapshot {
  config: MockConfig;
  ruleSeq: number;
  rules: RuleSnapshot[];
  /** Recorded call count per API at snapshot time. */
  calls: Map<string, number>;
  /** UI decisions / runtime state (toast, loading, modal, update manager). */
  ui: UiSnapshot;
  storage: StorageSnapshot;
  fileSystem: FileSystemSnapshot;
  events: EventListenerSnapshot;
  pages: unknown[];
  registrations: {
    app: unknown;
    pages: unknown[];
    components: unknown[];
    behaviors: unknown[];
  };
}

const MAX_CALLS_PER_API = 100;

const FAILURE_TYPES = new Set([
  "network",
  "timeout",
  "abort",
  "http",
  "quota",
  "noent",
  "permission",
  "cancel",
  "fail",
  "throw",
]);

const createConfig = (): MockConfig => ({
  auth: {},
  authorize: "allow",
  clipboard: null,
  compat: {},
  login: {},
  network: {},
  storage: {},
  system: {},
  user: {},
});

const cloneConfig = (config: MockConfig): MockConfig =>
  // oxlint-disable-next-line unicorn/prefer-structured-clone -- JSON round-trip matches what mini-program storage can serialise
  JSON.parse(JSON.stringify(config)) as MockConfig;

/**
 * Process-wide mutable mock state.
 *
 * Internal: exposed only for the mock implementation and its tests. Public access goes through
 * `mockWx`.
 */
export const mockState: {
  rules: MockRule[];
  calls: Map<string, unknown[][]>;
  config: MockConfig;
  ruleSeq: number;
} = {
  calls: new Map<string, unknown[][]>(),
  config: createConfig(),
  ruleSeq: 0,
  rules: [],
};

/** Allocate a monotonically increasing rule id. */
export const nextRuleSeq = (): number => {
  mockState.ruleSeq += 1;

  return mockState.ruleSeq;
};

/** Register one rule. */
export const addRule = (rule: MockRule): void => {
  mockState.rules.push(rule);
};

/** Whether a value looks like an injected failure rather than a response payload. */
export const isWxFailure = (value: unknown): value is WxFailure => {
  if (typeof value !== "object" || value == null) return false;

  const { type } = value as { type?: unknown };

  return typeof type === "string" && FAILURE_TYPES.has(type);
};

/** Record one `wx` call for `mockWx.calls()`. */
export const recordCall = (api: string, args: unknown[]): void => {
  const calls = mockState.calls.get(api);

  if (calls) {
    calls.push(args);
    if (calls.length > MAX_CALLS_PER_API) calls.shift();

    return;
  }

  mockState.calls.set(api, [args]);
};

/** Get recorded calls of one API. */
export const getCalls = (api: string): readonly unknown[][] => mockState.calls.get(api) ?? [];

/** Clear recorded calls of one API, or all calls when `api` is omitted. */
export const clearCalls = (api?: string): void => {
  if (typeof api === "string") mockState.calls.delete(api);
  else mockState.calls.clear();
};

const findRoute = (routes: readonly RouteEntry[], arg: unknown): RouteEntry | undefined => {
  // oxlint-disable-next-line no-undefined -- absence is the documented return value
  if (typeof arg !== "object" || arg == null) return undefined;

  const option = arg as { method?: unknown; url?: unknown };
  const url = typeof option.url === "string" ? option.url : "";
  const method = typeof option.method === "string" ? option.method.toUpperCase() : "GET";

  return routes.find((route) => {
    if (typeof route.method === "string" && route.method !== method) return false;
    if (route.regexp) return route.regexp.test(url);

    return route.url === url;
  });
};

/**
 * Find and consume the first matching rule for one call.
 *
 * Returns `null` when no rule matches, in which case the original mock implementation runs.
 */
export const consumeRule = (api: string, arg: unknown): MatchedRule | null => {
  for (const rule of mockState.rules) {
    if (rule.disposed || rule.remaining <= 0 || rule.api !== api) continue;
    if (rule.match && !rule.match(arg, rule.count)) continue;

    let route: RouteEntry | undefined;

    if (rule.kind === "route") {
      route = findRoute(rule.routes ?? [], arg);
      if (!route) continue;
    }

    const callIndex = rule.count;

    rule.remaining -= 1;
    rule.count += 1;

    const matched: MatchedRule = { rule };

    if (route) matched.route = route;

    if (rule.kind === "sequence") matched.failure = rule.failures?.[callIndex];
    else if (rule.failure) matched.failure = rule.failure;

    // oxlint-disable-next-line no-undefined -- a response value can be falsy, so presence must be checked against `undefined`
    if (rule.responder !== undefined) matched.responder = rule.responder;

    return matched;
  }

  return null;
};

/** Capture the current state for `scope()` / `autoRestore()`. */
export const snapshotState = (): MockStateSnapshot => ({
  calls: new Map([...mockState.calls].map(([api, calls]) => [api, calls.length])),
  config: cloneConfig(mockState.config),
  events: snapshotEventListeners(),
  fileSystem: getFileSystemManager().snapshot(),
  pages: [...(frameworkApi.currentPages as unknown[])],
  registrations: {
    app: frameworkApi.app,
    behaviors: [...(frameworkApi.behaviors as unknown[])],
    components: [...(frameworkApi.components as unknown[])],
    pages: [...(frameworkApi.pages as unknown[])],
  },
  rules: mockState.rules.map((rule) => ({
    count: rule.count,
    disposed: rule.disposed,
    remaining: rule.remaining,
    rule,
  })),
  ruleSeq: mockState.ruleSeq,
  storage: snapshotStorage(),
  ui: snapshotUi(),
});

const replaceArray = <T>(target: T[], next: readonly T[]): void => {
  target.length = 0;
  target.push(...next);
};

/** Restore a snapshot captured by `snapshotState()`. */
export const restoreState = (snapshot: MockStateSnapshot): void => {
  // Rules are immutable except for their counters, so only rules created after the snapshot
  // have to be dropped; the mutated counters of older rules are restored below.
  mockState.rules = mockState.rules.filter((rule) => rule.seq <= snapshot.ruleSeq);

  for (const saved of snapshot.rules) {
    saved.rule.count = saved.count;
    saved.rule.disposed = saved.disposed;
    saved.rule.remaining = saved.remaining;
  }

  mockState.ruleSeq = snapshot.ruleSeq;
  mockState.config = cloneConfig(snapshot.config);

  restoreStorage(snapshot.storage);
  restoreUi(snapshot.ui);
  getFileSystemManager().restore(snapshot.fileSystem);
  restoreEventListeners(snapshot.events);

  replaceArray(frameworkApi.currentPages, snapshot.pages);
  replaceArray(frameworkApi.pages, snapshot.registrations.pages);
  replaceArray(frameworkApi.components, snapshot.registrations.components);
  replaceArray(frameworkApi.behaviors, snapshot.registrations.behaviors);
  frameworkApi.app = snapshot.registrations.app;

  for (const [api, length] of snapshot.calls) {
    const calls = mockState.calls.get(api);

    if (calls) calls.length = Math.min(calls.length, length);
  }

  // oxlint-disable-next-line unicorn/prefer-spread -- the map is mutated while iterating
  for (const api of Array.from(mockState.calls.keys()))
    if (!snapshot.calls.has(api)) mockState.calls.delete(api);
};

/** Hard reset used by `mockWx.reset()`. */
export const resetState = (): void => {
  mockState.rules = [];
  mockState.ruleSeq = 0;
  mockState.config = createConfig();

  resetStorage();
  resetUi();
  getFileSystemManager().reset();
  clearEventListeners();

  frameworkApi.currentPages.length = 0;
  frameworkApi.pages.length = 0;
  frameworkApi.components.length = 0;
  frameworkApi.behaviors.length = 0;
  frameworkApi.app = void 0;

  // Clear the call log last: the internal `getFileSystemManager()` call above is recorded too.
  mockState.calls.clear();
};
