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

const deliverSuccess = (injection: Injection, option: CallbackOption, result: unknown): void => {
  option.success?.(result);
  option.complete?.({ errMsg: `${injection.api}:ok` });
};

/** Inject a failure into `wx.request`. */
const failRequest = (injection: Injection, failure: WxFailure): unknown => {
  const { fail, task } = createRequestTask(injection.arg as MockRequestOption | undefined);
  const { errMsg } = createFailureResult(injection.api, failure);

  later(() => {
    fail(errMsg);
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
  const { schedule, task } = createRequestTask(injection.arg as MockRequestOption | undefined);
  const value = resolveResponder(responder, injection);

  if (value instanceof Promise) {
    void value
      .then((result) => {
        schedule(injection.delay, result as Partial<MockRequestResult>);
      })
      .catch(() => {
        schedule(injection.delay, {});
      });

    return task;
  }

  schedule(injection.delay, value as Partial<MockRequestResult>);

  return task;
};

/** Replace the result of a callback-style or synchronous API. */
const respondPlain = (injection: Injection, responder: WxResponder): unknown => {
  const value = resolveResponder(responder, injection);

  if (injection.kind === "sync") {
    if (value instanceof Promise)
      throw new TypeError(`[mockWx] respond() for sync API "${injection.api}" must be synchronous`);

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
      return failRequest(injection, failure);
    }

    case "callback": {
      return failCallback(injection, failure);
    }

    default: {
      // event / manager / void rules are rejected at registration time.
      throw new TypeError(
        `[mockWx] failures cannot be injected into ${injection.kind} API "${injection.api}"`,
      );
    }
  }
};

const applyRespond = (injection: Injection, responder: WxResponder): unknown =>
  injection.kind === "task"
    ? respondRequest(injection, responder)
    : respondPlain(injection, responder);

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
