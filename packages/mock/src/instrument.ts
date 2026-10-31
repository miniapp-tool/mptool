// oxlint-disable typescript/consistent-return

import { createFailureError, createFailureResult, getApiKind } from "./failure.js";
import { createRequestTask } from "./network.js";
import type { MockRequestOption, MockRequestResult } from "./network.js";
import { consumeRule, isWxFailure, recordCall } from "./state.js";
import type { MatchedRule } from "./state.js";
import type { WxApiKind, WxFailure, WxResponder } from "./typings.js";

interface CallbackOption {
  success?: (result: unknown) => void;
  fail?: (result: unknown) => void;
  complete?: (result: { errMsg: string }) => void;
}

type AnyFunction = (...args: unknown[]) => unknown;
type TaskListener = (result?: unknown) => void;

/** Superset of the task methods used by request / download / upload / socket APIs. */
export interface MockInjectedTask {
  abort: () => void;
  close: () => void;
  offChunkReceived: (listener?: TaskListener) => void;
  offClose: (listener?: TaskListener) => void;
  offError: (listener?: TaskListener) => void;
  offHeadersReceived: (listener?: TaskListener) => void;
  offMessage: (listener?: TaskListener) => void;
  offOpen: (listener?: TaskListener) => void;
  offProgressUpdate: (listener?: TaskListener) => void;
  onChunkReceived: (listener: TaskListener) => void;
  onClose: (listener: TaskListener) => void;
  onError: (listener: TaskListener) => void;
  onHeadersReceived: (listener: TaskListener) => void;
  onMessage: (listener: TaskListener) => void;
  onOpen: (listener: TaskListener) => void;
  onProgressUpdate: (listener: TaskListener) => void;
  send: () => void;
}

/** Everything needed to inject one call. */
interface Injection {
  api: string;
  kind: WxApiKind;
  arg: unknown;
  callIndex: number;
  delay: number;
}

const hasCallbacks = (value: unknown): value is CallbackOption => {
  if (typeof value !== "object" || value == null) return false;

  const option = value as CallbackOption;

  return (
    typeof option.success === "function" ||
    typeof option.fail === "function" ||
    typeof option.complete === "function"
  );
};

const resolveResponder = (responder: WxResponder, injection: Injection): unknown => {
  if (typeof responder !== "function") return responder;

  return (responder as (arg: unknown, callIndex: number) => unknown)(
    injection.arg,
    injection.callIndex,
  );
};

const later = (callback: () => void, delay: number): void => {
  setTimeout(callback, delay);
};

/** Use the per-response `delay` when present and strip it from the response payload. */
const splitResponseDelay = (
  value: unknown,
  fallback: number,
): { delay: number; result: unknown } => {
  if (typeof value !== "object" || value == null) return { delay: fallback, result: value };

  const { delay } = value as { delay?: unknown };

  if (typeof delay !== "number") return { delay: fallback, result: value };

  const result = { ...(value as Record<string, unknown>) };

  delete result.delay;

  return { delay, result };
};

const deliverSuccess = (injection: Injection, option: CallbackOption, result: unknown): void => {
  option.success?.(result);
  option.complete?.({ errMsg: `${injection.api}:ok` });
};

const createListenerSlot = (): {
  off: (listener?: TaskListener) => void;
  on: (listener: TaskListener) => void;
} => {
  const listeners = new Set<TaskListener>();

  return {
    off(listener?: TaskListener): void {
      if (listener) listeners.delete(listener);
      else listeners.clear();
    },
    on(listener: TaskListener): void {
      listeners.add(listener);
    },
  };
};

/**
 * Create a task-shaped object for download / upload / socket failure injection.
 *
 * The mock in PR-1 does not emit progress or socket events for these APIs; the task only keeps the
 * real shape so code such as `wx.downloadFile(...).onProgressUpdate(...)` keeps working.
 */
const createInjectedTask = (
  api: string,
  option: CallbackOption | undefined,
): { settle: () => boolean; task: MockInjectedTask } => {
  const chunk = createListenerSlot();
  const close = createListenerSlot();
  const error = createListenerSlot();
  const headers = createListenerSlot();
  const message = createListenerSlot();
  const open = createListenerSlot();
  const progress = createListenerSlot();
  let settled = false;

  const task: MockInjectedTask = {
    abort(): void {
      if (settled) return;

      settled = true;

      later(() => {
        option?.fail?.({ errMsg: `${api}:fail abort` });
        option?.complete?.({ errMsg: `${api}:fail abort` });
      }, 0);
    },
    close(): void {
      // noop
    },
    offChunkReceived: chunk.off,
    offClose: close.off,
    offError: error.off,
    offHeadersReceived: headers.off,
    offMessage: message.off,
    offOpen: open.off,
    offProgressUpdate: progress.off,
    onChunkReceived: chunk.on,
    onClose: close.on,
    onError: error.on,
    onHeadersReceived: headers.on,
    onMessage: message.on,
    onOpen: open.on,
    onProgressUpdate: progress.on,
    send(): void {
      // noop
    },
  };

  return {
    settle(): boolean {
      if (settled) return false;

      settled = true;

      return true;
    },
    task,
  };
};

const createRequestInjection = (injection: Injection): MockRequestOption | undefined =>
  injection.arg as MockRequestOption | undefined;

/** Inject a failure into `wx.request`. */
const failRequest = (injection: Injection, failure: WxFailure): unknown => {
  const { fail, task } = createRequestTask(createRequestInjection(injection));
  const { errMsg } = createFailureResult(injection.api, failure);

  later(() => {
    fail(errMsg);
  }, injection.delay);

  return task;
};

/** Inject a failure into a task API other than `wx.request` (download / upload / socket). */
const failTask = (injection: Injection, failure: WxFailure): unknown => {
  const option = injection.arg as CallbackOption | undefined;
  const result = createFailureResult(injection.api, failure);
  const { settle, task } = createInjectedTask(injection.api, option);

  later(() => {
    if (!settle()) return;

    option?.fail?.(result);
    option?.complete?.(result);
  }, injection.delay);

  return task;
};

/** Inject a failure into a callback-style API (or reject a promise-style call). */
const failCallback = (injection: Injection, failure: WxFailure): unknown => {
  const option = injection.arg as CallbackOption | undefined;
  const result = createFailureResult(injection.api, failure);

  if (hasCallbacks(option)) {
    later(() => {
      option.fail?.(result);
      option.complete?.(result);
    }, injection.delay);

    return;
  }

  return new Promise((_resolve, reject) => {
    later(() => {
      reject(createFailureError(injection.api, failure));
    }, injection.delay);
  });
};

/** Replace the success payload of `wx.request`. */
const respondRequest = (injection: Injection, responder: WxResponder): unknown => {
  const { schedule, task } = createRequestTask(createRequestInjection(injection));
  const value = resolveResponder(responder, injection);
  const deliver = (response: unknown): void => {
    const { delay, result } = splitResponseDelay(response, injection.delay);

    schedule(delay, result as Partial<MockRequestResult>);
  };

  if (value instanceof Promise) {
    void value.then(deliver).catch(() => {
      schedule(injection.delay, {});
    });

    return task;
  }

  deliver(value);

  return task;
};

/** Replace the success payload of a task API other than `wx.request`. */
const respondTask = (injection: Injection, responder: WxResponder): unknown => {
  const option = injection.arg as CallbackOption | undefined;
  const value = resolveResponder(responder, injection);
  const { settle, task } = createInjectedTask(injection.api, option);
  const deliver = (response: unknown): void => {
    const { delay, result } = splitResponseDelay(response, injection.delay);

    later(() => {
      if (!settle()) return;

      option?.success?.(result);
      option?.complete?.({ errMsg: `${injection.api}:ok` });
    }, delay);
  };

  if (value instanceof Promise) {
    // A rejected responder must still settle the task (fail + complete); otherwise the rejection is
    // unhandled and both callbacks never fire.
    // responder 返回 rejected Promise 时仍要交付失败，否则会产生未捕获拒绝且回调永不触发。
    void value.then(deliver, () => {
      const result = createFailureResult(injection.api, {
        errMsg: `${injection.api}:fail`,
        type: "fail",
      });

      later(() => {
        if (!settle()) return;

        option?.fail?.(result);
        option?.complete?.(result);
      }, injection.delay);
    });
  } else {
    deliver(value);
  }

  return task;
};

/** Replace the result of a callback-style or synchronous API. */
const respondPlain = (injection: Injection, responder: WxResponder): unknown => {
  const value = resolveResponder(responder, injection);

  if (injection.kind === "sync" || injection.kind === "manager") {
    if (value instanceof Promise) {
      throw new TypeError(
        `[mockWx] respond() for ${injection.kind} API "${injection.api}" must be synchronous`,
      );
    }

    return value;
  }

  const option = injection.arg as CallbackOption | undefined;

  if (hasCallbacks(option)) {
    if (value instanceof Promise) {
      void value
        .then((result) => {
          later(() => {
            deliverSuccess(injection, option, result);
          }, injection.delay);
        })
        .catch(() => {
          // A rejected responder keeps the call pending, like a hanging request would.
        });
    } else {
      later(() => {
        deliverSuccess(injection, option, value);
      }, injection.delay);
    }

    return;
  }

  if (value instanceof Promise) return value;

  return new Promise((resolve) => {
    later(() => {
      resolve(value);
    }, injection.delay);
  });
};

const applyFailure = (injection: Injection, failure: WxFailure): unknown => {
  switch (injection.kind) {
    case "sync": {
      throw createFailureError(injection.api, failure);
    }

    case "task": {
      return injection.api === "request"
        ? failRequest(injection, failure)
        : failTask(injection, failure);
    }

    case "callback": {
      return failCallback(injection, failure);
    }

    // istanbul ignore next -- `assertInjectable` rejects event / void rules at registration time
    default: {
      throw new TypeError(
        `[mockWx] failures cannot be injected into ${injection.kind} API "${injection.api}"`,
      );
    }
  }
};

const applyRespond = (injection: Injection, responder: WxResponder): unknown => {
  if (injection.kind === "task") {
    return injection.api === "request"
      ? respondRequest(injection, responder)
      : respondTask(injection, responder);
  }

  return respondPlain(injection, responder);
};

const applyMatched = (injection: Injection, matched: MatchedRule): unknown => {
  if (matched.route) {
    const { response } = matched.route;

    if (isWxFailure(response)) {
      // `{ type: "http", statusCode }` is a successful response, not a failure.
      if (response.type === "http") {
        return applyRespond(injection, {
          data: response.data,
          header: response.header,
          statusCode: response.statusCode,
        });
      }

      return applyFailure(injection, response);
    }

    return applyRespond(injection, response);
  }

  // oxlint-disable-next-line no-undefined -- a response value can be falsy, so presence must be checked against `undefined`
  if (matched.responder !== undefined) return applyRespond(injection, matched.responder);

  // istanbul ignore next -- a `fail` / `sequence` rule always carries a failure, so the default
  // payload is only a fallback for a rule that matched without a route or responder.
  return applyFailure(
    injection,
    matched.failure ?? { errMsg: `${injection.api}:fail`, type: "fail" },
  );
};

const instrumentFunction = (api: string, original: AnyFunction): AnyFunction =>
  function instrumented(this: unknown, ...args: unknown[]): unknown {
    recordCall(api, args);

    const matched = consumeRule(api, args[0]);

    if (!matched) return original.apply(this, args);

    return applyMatched(
      {
        api,
        arg: args[0],
        callIndex: matched.rule.count - 1,
        delay: matched.rule.delay,
        kind: getApiKind(api),
      },
      matched,
    );
  };

/**
 * Wrap every `wx` function with a thin layer that records calls and applies injected rules.
 *
 * `wx` stays a plain object: wrappers are ordinary data properties, direct assignment still wins (a
 * manually replaced API bypasses the rules), and no `Proxy` or `Object.freeze` is involved.
 */
export const instrumentWx = (target: Record<string, unknown>): void => {
  for (const [api, value] of Object.entries(target)) {
    if (typeof value !== "function") continue;

    target[api] = instrumentFunction(api, value as AnyFunction);
  }
};
