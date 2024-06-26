import { expect, it } from "vitest";

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
  expect(parseUrl("https://example.com:443/a/b.html")).toStrictEqual({
    domain: "example.com",
    path: "/a/b.html",
  });

  expect(parseUrl("https://sub.example.com")).toStrictEqual({
    domain: "sub.example.com",
    path: "/",
  });
  expect(parseUrl("https://sub.example.com/a.jpg")).toStrictEqual({
    domain: "sub.example.com",
    path: "/a.jpg",
  });

  expect(parseUrl("https://sub.example.com/a/b.html")).toStrictEqual({
    domain: "sub.example.com",
    path: "/a/b.html",
  });
  expect(parseUrl("https://sub.example.com:443/a/b.html")).toStrictEqual({
    domain: "sub.example.com",
    path: "/a/b.html",
  });
});
