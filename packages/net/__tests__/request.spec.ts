import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { Headers, createRequest, request } from "../src/index.js";

describe(request, () => {
  it("should resolve a successful request", async () => {
    const res = await request("https://example.com/api");

    expect(res.status).toBe(200);
    expect(res.data).toStrictEqual({});
    expect(res.headers).toBeInstanceOf(Headers);
  });
});

describe(createRequest, () => {
  it("should throw when no server is provided for a relative url", () => {
    const { request: req } = createRequest();

    expect(() => req("/api")).toThrow("No server provided");
  });

  it("should prepend server to relative url", async () => {
    const { request: req } = createRequest({ server: "https://example.com/" });

    const res = await req("/api");

    expect(res.status).toBe(200);
  });

  it("should keep absolute url", async () => {
    const { request: req } = createRequest({ server: "https://example.com" });

    const res = await req("https://other.com/api");

    expect(res.status).toBe(200);
  });
});
