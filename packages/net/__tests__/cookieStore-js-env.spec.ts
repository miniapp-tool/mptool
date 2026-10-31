import { env } from "@mptool/shared";
import { describe, expect, it } from "vitest";

import { CookieStore } from "../src/cookieStore.js";
import { Headers } from "../src/headers.js";

// `@mptool/shared` derives `env` from the presence of the global `wx` at import time. This file
// deliberately does not import `@mptool/mock`, so the module graph sees a browser-like ("js")
// environment and the fetch-style `Headers` / `Response` branches of `CookieStore` are used.
describe("cookie store in a JavaScript environment", () => {
  it("detects the js environment", () => {
    expect(env).toBe("js");
  });

  it("applies fetch Headers via applyHeader", () => {
    const store = new CookieStore("js-env-header");
    const headers = new Headers();

    headers.append("Set-Cookie", "a=1; Domain=example.com; Path=/");

    store.applyHeader(headers, "https://example.com/");

    expect(store.getHeader("https://example.com/")).toBe("a=1");
  });

  it("applies a fetch Response via applyResponse", () => {
    const store = new CookieStore("js-env-response");
    const headers = new Headers();

    headers.append("Set-Cookie", "session=abc; Path=/; Max-Age=3600");

    store.applyResponse({ headers }, "https://api.example.com/");

    expect(store.getValue("session", { domain: "api.example.com", path: "/" })).toBe("abc");
  });

  it("applies a plain header record and wx response in the js environment", () => {
    const store = new CookieStore("js-env-plain-header");

    store.applyResponse(
      { header: { "Set-Cookie": "sid=xyz; Path=/" } },
      "https://api.example.com/",
    );

    expect(store.getValue("sid", { domain: "api.example.com", path: "/" })).toBe("xyz");
  });

  it("keeps the default storage key", () => {
    const store = new CookieStore();

    store.set({ name: "a", value: "1", domain: "example.com" });

    expect(store.getHeader("example.com")).toBe("a=1");
  });
});
