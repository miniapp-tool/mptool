import { it, expect } from "vitest";

import { parseUrl } from "../src/utils.js";

it("Should parse domain and path for url", () => {
  expect(parseUrl("https://example.com")).toStrictEqual({
    domain: "example.com",
    path: "/",
  });
  expect(parseUrl("https://example.com/a.jpg")).toStrictEqual({
    domain: "example.com",
    path: "/a.jpg",
  });

  expect(parseUrl("https://example.com/a/b.html")).toStrictEqual({
    domain: "example.com",
    path: "/a/b.html",
  });
});
