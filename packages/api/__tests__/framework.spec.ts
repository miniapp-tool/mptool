import { frameworkApi } from "@mptool/mock";
import { describe, expect, it } from "vitest";

import { getCurrentPage, getCurrentRoute } from "../src/index.js";

describe(getCurrentPage, () => {
  it("should return current page", () => {
    frameworkApi.currentPages = [{ route: "/pages/main" }];

    expect(getCurrentPage()).toStrictEqual({ route: "/pages/main" });
  });

  it("should return null when no pages", () => {
    frameworkApi.currentPages = [];

    expect(getCurrentPage()).toBeNull();
  });
});

describe(getCurrentRoute, () => {
  it("should return current route", () => {
    frameworkApi.currentPages = [{ route: "/pages/main" }];

    expect(getCurrentRoute()).toBe("/pages/main");
  });

  it("should return empty string when no pages", () => {
    frameworkApi.currentPages = [];

    expect(getCurrentRoute()).toBe("");
  });
});
