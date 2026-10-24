import "@mptool/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CookieStore } from "../src/cookieStore.js";
import type { RequestOptions } from "../src/index.js";
import { Headers, URLSearchParams, createRequest, request } from "../src/index.js";

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

describe(request, () => {
  it("should resolve a successful request", async () => {
    mockRequest();

    const res = await request("https://example.com/api");

    expect(res.status).toBe(200);
    expect(res.data).toStrictEqual({});
    expect(res.headers).toBeInstanceOf(Headers);
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

    api.abort("page");
    await expect(pageRequest).rejects.toMatchObject({ type: "abort" });
    expect(tasks[0].abort).toHaveBeenCalledTimes(1);
    expect(api.pendingCount()).toBe(1);

    api.abortAll();
    await expect(otherRequest).rejects.toMatchObject({ type: "abort" });
    expect(tasks[1].abort).toHaveBeenCalledTimes(1);
    expect(api.pendingCount()).toBe(0);
  });
});
