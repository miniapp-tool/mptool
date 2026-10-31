import "@mptool/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CookieStore } from "../src/cookieStore.js";
import type { RequestOptions } from "../src/index.js";
import {
  Headers,
  URLSearchParams,
  createRequest,
  request,
  requestCookieStore,
} from "../src/index.js";

interface MockRequestCall {
  method: string;
  url: string;
  header: Record<string, string>;
  data: unknown;
}

const mockRequest = (fail = false): MockRequestCall[] => {
  const calls: MockRequestCall[] = [];
  const mockRequestApi = wx as unknown as {
    request: (option: {
      url: string;
      method: string;
      header: Record<string, string>;
      data: unknown;
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
      fail?: (result: { errMsg: string; errno?: number }) => void;
    }) => void;
  };

  mockRequestApi.request = (option): void => {
    calls.push({
      method: option.method,
      url: option.url,
      header: option.header,
      data: option.data,
    });

    if (fail) option.fail?.({ errMsg: "request fail", errno: 2001 });
    else option.success?.({ data: {}, statusCode: 200, header: {} });
  };

  return calls;
};

// Capture `logger.debug` output. `logger.debug` only writes in wx env when `wx.env.DEBUG` is set,
// and its logger namespace is a read-only ES module namespace, so the observable output is
// `console.debug` (read the calls before restoring the spy).
const captureDebugLogs = async (run: () => Promise<unknown>): Promise<string> => {
  const wxEnv = wx.env as unknown as Record<string, unknown>;
  const originalDebug = wxEnv.DEBUG;
  const debugSpy = vi.spyOn(console, "debug").mockReturnValue(undefined);

  wxEnv.DEBUG = true;

  let logs = "";

  try {
    await run();
  } finally {
    // Read the calls before restoring the spy: `mockRestore()` clears its mock state
    logs = debugSpy.mock.calls
      .map((args) =>
        args.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" "),
      )
      .join("\n");

    wxEnv.DEBUG = originalDebug;
    if (originalDebug === undefined) delete wxEnv.DEBUG;
    debugSpy.mockRestore();
  }

  return logs;
};

describe(request, () => {
  it("should resolve a successful request", async () => {
    mockRequest();

    const res = await request("https://example.com/api");

    expect(res.status).toBe(200);
    expect(res.data).toStrictEqual({});
    expect(res.headers).toBeInstanceOf(Headers);
  });

  it("should redact cookie and authorization values in debug logs", async () => {
    mockRequest();

    const cookieStore = new CookieStore("debug-redaction-test");

    cookieStore.set({
      name: "session",
      value: "super-secret-token",
      domain: "example.com",
      path: "/",
    });

    const logs = await captureDebugLogs(() =>
      request("https://example.com/api", {
        cookieStore,
        headers: { Authorization: "Bearer secret-bearer" },
      }),
    );

    // Cookie names stay useful for debugging, values never appear
    expect(logs).toContain("session");
    expect(logs).not.toContain("super-secret-token");
    expect(logs).not.toContain("secret-bearer");
    expect(logs).toContain("<redacted>");
  });

  it("should cap the logged response body length", async () => {
    const wxAny = wx as unknown as {
      request: (option: {
        success?: (result: {
          data: unknown;
          statusCode: number;
          header: Record<string, string>;
        }) => void;
      }) => void;
    };
    const original = wxAny.request;

    wxAny.request = (option): void => {
      option.success?.({ data: "x".repeat(2000), statusCode: 200, header: {} });
    };

    try {
      const logs = await captureDebugLogs(() => request("https://example.com/long-body"));

      expect(logs).toContain("truncated, 2000 chars");
      expect(logs.length).toBeLessThan(1500);
    } finally {
      wxAny.request = original;
    }
  });

  it("should summarize binary and unserializable response bodies", async () => {
    const wxAny = wx as unknown as {
      request: (option: {
        success?: (result: {
          data: unknown;
          statusCode: number;
          header: Record<string, string>;
        }) => void;
      }) => void;
    };
    const original = wxAny.request;
    const circular: Record<string, unknown> = {};

    circular.self = circular;

    const bodies: [unknown, string][] = [
      [new ArrayBuffer(8), "[ArrayBuffer 8 bytes]"],
      [new Uint8Array(4), "[Uint8Array 4 bytes]"],
      [circular, "[object]"],
      [undefined, "Request ends with 200 undefined"],
    ];

    try {
      for (const [body, expected] of bodies) {
        wxAny.request = (option): void => {
          option.success?.({ data: body, statusCode: 200, header: {} });
        };

        // oxlint-disable-next-line eslint/no-await-in-loop -- each body needs its own wx.request mock
        const logs = await captureDebugLogs(() => request("https://example.com/body"));

        expect(logs).toContain(expected);
      }
    } finally {
      wxAny.request = original;
    }
  });

  it("should uppercase method and set json content-type for plain object body", async () => {
    const calls = mockRequest();

    await request("https://example.com/api", { method: "post", body: { a: 1 } });

    const [call] = calls;

    expect(call.method).toBe("POST");
    expect(call.header["content-type"]).toBe("application/json; charset=UTF-8");
    expect(call.data).toStrictEqual({ a: 1 });
  });

  it("should set form content-type for URLSearchParams body", async () => {
    const calls = mockRequest();

    await request("https://example.com/api", { body: new URLSearchParams({ a: "1", b: "2" }) });

    const [call] = calls;

    expect(call.header["content-type"]).toBe("application/x-www-form-urlencoded; charset=UTF-8");
    expect(call.data).toBe("a=1&b=2");
  });

  it("should set octet-stream content-type for ArrayBuffer body", async () => {
    const calls = mockRequest();
    const { buffer } = new TextEncoder().encode("data");

    await request("https://example.com/api", { body: buffer });

    const [call] = calls;

    expect(call.header["content-type"]).toBe("application/octet-stream; charset=UTF-8");
    expect(call.data).toBe(buffer);
  });

  it("should keep user provided content-type", async () => {
    const calls = mockRequest();

    await request("https://example.com/api", {
      headers: { "Content-Type": "text/plain" },
      body: { a: 1 },
    });

    const [call] = calls;

    expect(call.header["content-type"]).toBe("text/plain");
  });

  it("should inject cookie header from cookie store", async () => {
    const calls = mockRequest();
    const cookieStore = new CookieStore("request-cookie-test");
    cookieStore.set({ name: "session", value: "abc", domain: "example.com", path: "/" });

    await request("https://example.com/api", { cookieStore });

    const [call] = calls;

    expect(call.header.cookie).toContain("session=abc");
  });

  it('should join a caller cookie header and stored cookies with "; "', async () => {
    const calls = mockRequest();
    const cookieStore = new CookieStore("request-cookie-merge-test");

    cookieStore.set({ name: "session", value: "abc", domain: "example.com", path: "/" });

    await request("https://example.com/api", {
      headers: { Cookie: "theme=dark" },
      cookieStore,
    });

    expect(calls[0].header.cookie).toBe("theme=dark; session=abc");
  });

  it("should keep only the stored cookies when no cookie header is provided", async () => {
    const calls = mockRequest();
    const cookieStore = new CookieStore("request-cookie-no-header-test");

    cookieStore.set({ name: "session", value: "abc", domain: "example.com", path: "/" });

    await request("https://example.com/api", { cookieStore });

    expect(calls[0].header.cookie).toBe("session=abc");
  });

  it("should allow an empty cookie scope with a custom cookie store", async () => {
    const calls = mockRequest();
    const cookieStore = {
      getHeader: (): string => "",
      applyHeader: (): void => void 0,
    } as unknown as CookieStore;

    const res = await request("https://example.com/api", { cookieScope: "", cookieStore });

    expect(res.status).toBe(200);
    expect(calls[0].header.cookie).toBeUndefined();
  });

  it("should reject with MpError when request fails", async () => {
    mockRequest(true);

    await expect(request("https://example.com/api")).rejects.toThrow("request fail");
  });

  it("should ignore a caller-provided success callback", async () => {
    const calls = mockRequest();
    const onSuccess = vi.fn<() => void>();

    const res = await request("https://example.com/api", {
      success: onSuccess,
    } as unknown as RequestOptions);

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("should ignore a caller-provided fail callback", async () => {
    mockRequest(true);
    const onFail = vi.fn<() => void>();

    await expect(
      request("https://example.com/api", { fail: onFail } as unknown as RequestOptions),
    ).rejects.toThrow("request fail");
    expect(onFail).not.toHaveBeenCalled();
  });

  it("should persist response cookies even when success is provided", async () => {
    const mockRequestApi = wx as unknown as {
      request: (option: {
        success?: (result: {
          data: unknown;
          statusCode: number;
          header: Record<string, string>;
        }) => void;
      }) => void;
    };

    mockRequestApi.request = (option): void => {
      option.success?.({
        data: {},
        statusCode: 200,
        header: { "Set-Cookie": "session=abc; Path=/" },
      });
    };

    const cookieStore = new CookieStore("request-callback-cookie");

    await request("https://example.com/api", {
      cookieStore,
      success: vi.fn<() => void>(),
    } as unknown as RequestOptions);

    expect(cookieStore.getValue("session", { domain: "example.com", path: "/" })).toBe("abc");
  });
});

describe(createRequest, () => {
  it("should throw when no server is provided for a relative url", () => {
    const { request: req } = createRequest();

    expect(() => req("/api")).toThrow("No server provided");
  });

  it("should prepend server to relative url", async () => {
    const calls = mockRequest();
    const { request: req } = createRequest({ server: "https://example.com/" });

    const res = await req("/api");

    expect(res.status).toBe(200);

    const [call] = calls;

    expect(call.url).toBe("https://example.com/api");
  });

  it("should keep absolute url", async () => {
    const calls = mockRequest();
    const { request: req } = createRequest({ server: "https://example.com" });

    const res = await req("https://other.com/api");

    expect(res.status).toBe(200);

    const [call] = calls;

    expect(call.url).toBe("https://other.com/api");
  });

  it("should add the https scheme to a bare host", async () => {
    const calls = mockRequest();
    const { request: req } = createRequest();

    const res = await req("example.com/api");

    expect(res.status).toBe(200);
    expect(calls[0].url).toBe("https://example.com/api");
  });

  it("should resolve the cookie store from the factory options", () => {
    const cookieStore = new CookieStore("factory-store-instance");
    const fromInstance = createRequest({ cookieStore });
    const fromKey = createRequest({ cookieStore: "factory-store-key" });
    const fromDefault = createRequest();

    expect(fromInstance.cookieStore).toBe(cookieStore);
    expect(fromKey.cookieStore).toBeInstanceOf(CookieStore);
    expect(fromKey.cookieStore).not.toBe(cookieStore);
    expect(fromDefault.cookieStore).toBe(requestCookieStore);
  });

  it("should call errorHandler when request fails with MpError", async () => {
    const mockRequestApi = wx as unknown as {
      request: (option: { fail?: (result: { errMsg: string; errno?: number }) => void }) => void;
    };

    mockRequestApi.request = (option): void => {
      option.fail?.({ errMsg: "fail", errno: 500 });
    };
    const errorHandler = vi.fn<() => void>();
    const { request: req } = createRequest({
      server: "https://example.com",
      errorHandler: errorHandler as never,
    });

    await req("/api");

    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({ name: "MpError", code: 500 }),
      "/api",
      expect.anything(),
    );
  });

  it("should rethrow non-MpError when errorHandler is set", async () => {
    mockRequest();
    const errorHandler = vi.fn<() => void>();
    const { request: req } = createRequest({
      server: "https://example.com",
      responseHandler: (): never => {
        throw new Error("boom");
      },
      errorHandler: errorHandler as never,
    });

    await expect(req("/api")).rejects.toThrow("boom");
    expect(errorHandler).not.toHaveBeenCalled();
  });
});

describe("request cancellation", () => {
  const defaultWxRequest = (wx as unknown as { request: unknown }).request;
  const createTask = (): {
    task: {
      abort: ReturnType<typeof vi.fn<() => void>>;
      onHeadersReceived: () => void;
      offHeadersReceived: () => void;
    };
    fail: (errMsg?: string, errno?: number) => void;
    success: (statusCode?: number, header?: Record<string, string>) => void;
  } => {
    const task = {
      abort: vi.fn<() => void>(),
      onHeadersReceived: (): void => void 0,
      offHeadersReceived: (): void => void 0,
    };
    let failHandler: ((result: { errMsg: string; errno?: number }) => void) | undefined,
      successHandler:
        | ((result: { data: unknown; statusCode: number; header: Record<string, string> }) => void)
        | undefined;

    (wx as unknown as { request: unknown }).request = (option: {
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
      fail?: (result: { errMsg: string; errno?: number }) => void;
    }): unknown => {
      successHandler = option.success;
      failHandler = option.fail;

      return task;
    };

    return {
      task,
      fail: (errMsg = "request:fail abort", errno = 0): void => {
        failHandler?.({ errMsg, errno });
      },
      success: (statusCode = 200, header: Record<string, string> = {}): void => {
        successHandler?.({ data: {}, statusCode, header });
      },
    };
  };

  // oxlint-disable-next-line vitest/no-hooks -- restore wx.request between tests
  afterEach(() => {
    (wx as unknown as { request: unknown }).request = defaultWxRequest;
  });

  it("should abort an in-flight request", async () => {
    const { task, fail } = createTask();
    const req = request("https://example.com/api");

    req.abort();

    expect(task.abort).toHaveBeenCalledTimes(1);
    await expect(req).rejects.toMatchObject({ type: "abort" });

    // abort() 之后才到达的 fail 不应再改变结果
    fail();
  });

  it("should reject without calling wx.request when the signal is already aborted", async () => {
    let called = 0;

    (wx as unknown as { request: unknown }).request = (): void => {
      called += 1;
    };

    const req = request("https://example.com/api", { signal: { aborted: true } });

    await expect(req).rejects.toMatchObject({ type: "abort" });
    expect(called).toBe(0);
  });

  it("should pass the request task to onTask", async () => {
    const { task, success } = createTask();
    const onTask = vi.fn<(requestTask: unknown) => void>();

    const req = request("https://example.com/api", { onTask });

    expect(onTask).toHaveBeenCalledWith(task);

    success();
    await req;
  });

  it("should warn about a timeout failure", async () => {
    const { fail } = createTask();

    const req = request("https://example.com/api");

    fail("request:fail timeout");
    await expect(req).rejects.toMatchObject({ type: "timeout" });
  });

  it("should abort when the signal dispatches abort and clean up the listener", async () => {
    const removeEventListener = vi.fn<() => void>();
    let listener: (() => void) | undefined;

    createTask();

    const req = request("https://example.com/api", {
      signal: {
        aborted: false,
        addEventListener: (_type: "abort", onAbort: () => void): void => {
          listener = onAbort;
        },
        removeEventListener,
      },
    });

    expect(listener).toBeTypeOf("function");

    listener?.();

    await expect(req).rejects.toMatchObject({ type: "abort" });
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("should remove the signal listener after a successful request", async () => {
    const removeEventListener = vi.fn<() => void>();
    const { success } = createTask();

    const req = request("https://example.com/api", {
      signal: {
        aborted: false,
        addEventListener: (): void => void 0,
        removeEventListener,
      },
    });

    success();
    await req;

    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("should not start a request when the signal aborts while subscribing", async () => {
    const requestSpy = vi.fn<() => unknown>(() => undefined);

    (wx as unknown as { request: unknown }).request = requestSpy;

    // A custom signal may notify the listener synchronously when it is aborted between the
    // initial `aborted` check and the listener registration.
    const req = request("https://example.com/api", {
      signal: {
        aborted: false,
        addEventListener: (_type: "abort", listener: () => void): void => {
          listener();
        },
      },
    });

    await expect(req).rejects.toMatchObject({ type: "abort" });
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("should ignore a second abort", async () => {
    const { task } = createTask();
    const req = request("https://example.com/api");

    req.abort();
    req.abort();

    expect(task.abort).toHaveBeenCalledTimes(1);
    await expect(req).rejects.toMatchObject({ type: "abort" });
  });

  it("should cancel a scheduled retry when aborted", async () => {
    vi.useFakeTimers();

    try {
      const { fail } = createTask();
      const req = request("https://example.com/api", { retry: { attempts: 3, delay: 1000 } });

      fail("request:fail network");
      expect(vi.getTimerCount()).toBe(1);

      req.abort();

      expect(vi.getTimerCount()).toBe(0);
      await expect(req).rejects.toMatchObject({ type: "abort" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("should expose no task once the request has settled", async () => {
    const { success } = createTask();
    const req = request("https://example.com/api");

    expect(req.task).toBeDefined();

    success();
    await req;

    expect(req.task).toBeUndefined();
  });

  it("should ignore a success that arrives after abort", async () => {
    const { success } = createTask();
    const req = request("https://example.com/api");

    req.abort();
    success();

    await expect(req).rejects.toMatchObject({ type: "abort" });
  });

  it("should abort when wx.request returns no task", async () => {
    (wx as unknown as { request: unknown }).request = (): undefined => undefined;

    const req = request("https://example.com/api");

    req.abort();

    await expect(req).rejects.toMatchObject({ type: "abort" });
  });
});

describe("request retry", () => {
  const defaultWxRequest = (wx as unknown as { request: unknown }).request;
  const fakeTask = (): unknown => ({
    abort: (): void => void 0,
    onHeadersReceived: (): void => void 0,
    offHeadersReceived: (): void => void 0,
  });

  // oxlint-disable-next-line vitest/no-hooks -- restore wx.request between tests
  afterEach(() => {
    (wx as unknown as { request: unknown }).request = defaultWxRequest;
  });

  it("should retry a GET request and resolve after success", async () => {
    let attempt = 0;
    const onRetry = vi.fn<() => void>();

    const steps = [
      (option: { fail?: (result: { errMsg: string }) => void }): void => {
        option.fail?.({ errMsg: "request:fail network" });
      },
      (option: { fail?: (result: { errMsg: string }) => void }): void => {
        option.fail?.({ errMsg: "request:fail network" });
      },
      (option: {
        success?: (result: {
          data: unknown;
          statusCode: number;
          header: Record<string, string>;
        }) => void;
      }): void => {
        option.success?.({ data: { ok: true }, statusCode: 200, header: {} });
      },
    ];

    (wx as unknown as { request: unknown }).request = (option: never): unknown => {
      steps[attempt]?.(option);
      attempt += 1;

      return fakeTask();
    };

    const res = await request("https://example.com/api", {
      retry: { attempts: 3, delay: 0, methods: ["GET"], onRetry },
    });

    expect(res.data).toStrictEqual({ ok: true });
    expect(attempt).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("should not retry POST requests by default", async () => {
    let attempt = 0;

    (wx as unknown as { request: unknown }).request = (option: {
      fail?: (result: { errMsg: string }) => void;
    }): unknown => {
      attempt += 1;
      option.fail?.({ errMsg: "request:fail network" });

      return fakeTask();
    };

    await expect(
      request("https://example.com/api", { method: "POST", retry: { attempts: 3, delay: 0 } }),
    ).rejects.toMatchObject({ type: "network" });
    expect(attempt).toBe(1);
  });

  it("should resolve the last response after HTTP retries are exhausted", async () => {
    let attempt = 0;

    (wx as unknown as { request: unknown }).request = (option: {
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      attempt += 1;
      option.success?.({ data: {}, statusCode: 503, header: {} });

      return fakeTask();
    };

    const res = await request("https://example.com/api", {
      retry: { attempts: 2, delay: 0, statusCodes: [503] },
    });

    expect(res.status).toBe(503);
    expect(attempt).toBe(2);
  });

  it("should reject HTTP errors when rejectOnHttpError is set", async () => {
    (wx as unknown as { request: unknown }).request = (option: {
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      option.success?.({ data: {}, statusCode: 500, header: {} });

      return fakeTask();
    };

    await expect(
      request("https://example.com/api", {
        retry: { attempts: 2, delay: 0, statusCodes: [500], rejectOnHttpError: true },
      }),
    ).rejects.toMatchObject({ code: 500, type: "http" });
  });

  it("should refresh the cookie header between attempts", async () => {
    const headers: Record<string, string>[] = [];
    let attempt = 0;
    const cookieStore = new CookieStore("request-retry-cookie");

    (wx as unknown as { request: unknown }).request = (option: {
      header: Record<string, string>;
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      headers.push(option.header);

      const steps = [
        (): void => {
          option.success?.({
            data: {},
            statusCode: 503,
            header: { "Set-Cookie": "sid=abc; Path=/" },
          });
        },
        (): void => {
          option.success?.({ data: {}, statusCode: 200, header: {} });
        },
      ];

      steps[attempt]?.();
      attempt += 1;

      return fakeTask();
    };

    await request("https://example.com/api", {
      cookieStore,
      retry: { attempts: 2, delay: 0, statusCodes: [503] },
    });

    expect(headers[0].cookie).toBeUndefined();
    expect(headers[1].cookie).toContain("sid=abc");
  });

  it("should apply the retry defaults when the config is empty", async () => {
    let attempt = 0;

    (wx as unknown as { request: unknown }).request = (option: {
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      attempt += 1;
      option.success?.({ data: {}, statusCode: 200, header: {} });

      return fakeTask();
    };

    const res = await request("https://example.com/api", { retry: {} });

    expect(res.status).toBe(200);
    expect(attempt).toBe(1);
  });

  it("should pass the failure to onRetry without a response", async () => {
    let attempt = 0;
    const onRetry = vi.fn<
      (info: {
        attempt: number;
        delay: number;
        error?: { type: string };
        response?: unknown;
      }) => number
    >(() => 0);

    (wx as unknown as { request: unknown }).request = (option: {
      fail?: (result: { errMsg: string }) => void;
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      const steps = [
        (): void => option.fail?.({ errMsg: "request:fail network" }),
        (): void => option.success?.({ data: {}, statusCode: 200, header: {} }),
      ];

      steps[attempt]?.();
      attempt += 1;

      return fakeTask();
    };

    await request("https://example.com/api", { retry: { attempts: 2, onRetry } });

    expect(onRetry).toHaveBeenCalledTimes(1);

    const [[info]] = onRetry.mock.calls;

    expect(info).toMatchObject({ attempt: 2, delay: 300, error: { type: "network" } });
    expect(info).not.toHaveProperty("response");
  });

  it("should pass the response to onRetry without an error", async () => {
    const onRetry = vi.fn<
      (info: {
        attempt: number;
        delay: number;
        error?: unknown;
        response?: { status: number };
      }) => number
    >(() => 0);

    (wx as unknown as { request: unknown }).request = (option: {
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      option.success?.({ data: {}, statusCode: 503, header: {} });

      return fakeTask();
    };

    const res = await request("https://example.com/api", {
      retry: { attempts: 2, delay: 0, statusCodes: [503], onRetry },
    });

    expect(res.status).toBe(503);

    const [[info]] = onRetry.mock.calls;

    expect(info).toMatchObject({ attempt: 2, delay: 0, response: { status: 503 } });
    expect(info).not.toHaveProperty("error");
  });

  it("should fall back to the default delay when onRetry returns a negative value", async () => {
    let attempt = 0;

    (wx as unknown as { request: unknown }).request = (option: {
      fail?: (result: { errMsg: string }) => void;
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): unknown => {
      const steps = [
        (): void => option.fail?.({ errMsg: "request:fail network" }),
        (): void => option.success?.({ data: {}, statusCode: 200, header: {} }),
      ];

      steps[attempt]?.();
      attempt += 1;

      return fakeTask();
    };

    const res = await request("https://example.com/api", {
      retry: { attempts: 2, delay: 1, onRetry: (): number => -1 },
    });

    expect(res.status).toBe(200);
    expect(attempt).toBe(2);
  });

  it("should not start a retry scheduled after onRetry aborted the request", async () => {
    let attempt = 0;
    const holder: { req?: ReturnType<typeof request> } = {};
    const onRetry = vi.fn<() => number>(() => {
      // only the retry scheduled after the first attempt has access to the promise
      holder.req?.abort();

      return 0;
    });

    (wx as unknown as { request: unknown }).request = (option: {
      fail?: (result: { errMsg: string }) => void;
    }): unknown => {
      attempt += 1;
      option.fail?.({ errMsg: "request:fail network" });

      return fakeTask();
    };

    const req = request("https://example.com/api", {
      retry: { attempts: 3, delay: 0, onRetry },
    });

    holder.req = req;

    await expect(req).rejects.toMatchObject({ type: "abort" });

    // the timer set up after the abort must not start another attempt
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0);
    });

    expect(attempt).toBe(2);
  });
});

describe("request failure classification", () => {
  const defaultWxRequest = (wx as unknown as { request: unknown }).request;

  // oxlint-disable-next-line vitest/no-hooks -- restore wx.request between tests
  afterEach(() => {
    (wx as unknown as { request: unknown }).request = defaultWxRequest;
  });

  it("should classify an abort failure and never retry it", async () => {
    let attempt = 0;

    (wx as unknown as { request: unknown }).request = (option: {
      fail?: (result: { errMsg: string }) => void;
    }): unknown => {
      attempt += 1;
      option.fail?.({ errMsg: "request:fail abort" });

      return {
        abort: (): void => void 0,
        onHeadersReceived: (): void => void 0,
        offHeadersReceived: (): void => void 0,
      };
    };

    await expect(
      request("https://example.com/api", { retry: { attempts: 3, delay: 0 } }),
    ).rejects.toMatchObject({ type: "abort" });
    expect(attempt).toBe(1);
  });

  it("should fall back to a generic failure message", async () => {
    (wx as unknown as { request: unknown }).request = (option: {
      fail?: (result: { errMsg: string }) => void;
    }): unknown => {
      option.fail?.({ errMsg: "" });

      return {
        abort: (): void => void 0,
        onHeadersReceived: (): void => void 0,
        offHeadersReceived: (): void => void 0,
      };
    };

    await expect(request("https://example.com/api")).rejects.toThrow("request:fail");
  });
});

describe("request factory cancellation", () => {
  const defaultWxRequest = (wx as unknown as { request: unknown }).request;
  const tasks: { abort: ReturnType<typeof vi.fn<() => void>> }[] = [];

  // oxlint-disable-next-line vitest/no-hooks -- restore wx.request between tests
  afterEach(() => {
    (wx as unknown as { request: unknown }).request = defaultWxRequest;
    tasks.length = 0;
  });

  it("should abort requests by cancelKey and abortAll", async () => {
    (wx as unknown as { request: unknown }).request = (): unknown => {
      const task = {
        abort: vi.fn<() => void>(),
        onHeadersReceived: (): void => void 0,
        offHeadersReceived: (): void => void 0,
      };

      tasks.push(task);

      return task;
    };

    const api = createRequest({ server: "https://example.com" });
    const pageRequest = api.request("/a", { cancelKey: "page" });
    const otherRequest = api.request("/b", { cancelKey: "other" });

    expect(api.pendingCount()).toBe(2);
    expect(pageRequest.task).toBe(tasks[0]);

    // an unknown key is a no-op
    api.abort("missing");

    api.abort("page");
    await expect(pageRequest).rejects.toMatchObject({ type: "abort" });
    expect(tasks[0].abort).toHaveBeenCalledTimes(1);
    expect(api.pendingCount()).toBe(1);

    api.abortAll();
    await expect(otherRequest).rejects.toMatchObject({ type: "abort" });
    expect(tasks[1].abort).toHaveBeenCalledTimes(1);
    expect(api.pendingCount()).toBe(0);
  });

  it("should group multiple requests under one cancelKey", async () => {
    (wx as unknown as { request: unknown }).request = (): unknown => {
      const task = {
        abort: vi.fn<() => void>(),
        onHeadersReceived: (): void => void 0,
        offHeadersReceived: (): void => void 0,
      };

      tasks.push(task);

      return task;
    };

    const api = createRequest({ server: "https://example.com" });
    const first = api.request("/a", { cancelKey: "batch" });
    const second = api.request("/b", { cancelKey: "batch" });

    expect(api.pendingCount()).toBe(2);

    api.abort("batch");

    await expect(first).rejects.toMatchObject({ type: "abort" });
    await expect(second).rejects.toMatchObject({ type: "abort" });
    expect(api.pendingCount()).toBe(0);
  });
});

describe("request response headers", () => {
  it("should ignore invalid response headers instead of hanging", async () => {
    (wx as unknown as { request: unknown }).request = (option: {
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
    }): void => {
      option.success?.({
        data: {},
        statusCode: 200,
        header: { "Bad Name": "x", "X-Good": "yes" },
      });
    };

    const res = await request("https://example.com/api");

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Good")).toBe("yes");
    expect([...res.headers.keys()]).toStrictEqual(["x-good"]);
  });
});

describe("request url validation", () => {
  it("should reject a relative url before calling wx.request", () => {
    const requestSpy = vi.fn<() => void>();
    const defaultRequest = (wx as unknown as { request: unknown }).request;

    (wx as unknown as { request: unknown }).request = requestSpy;

    try {
      expect(() => request("/api")).toThrow(new TypeError('request url must be absolute: "/api"'));
      expect(requestSpy).not.toHaveBeenCalled();
    } finally {
      (wx as unknown as { request: unknown }).request = defaultRequest;
    }
  });

  it("should reject a cookieScope without a domain", () => {
    expect(() => request("https://example.com/api", { cookieScope: "/api" })).toThrow(
      new TypeError('Cookie scope must include a domain: "/api"'),
    );
  });
});
