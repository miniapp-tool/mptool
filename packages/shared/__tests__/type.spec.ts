import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { type } from "../src";

describe(type, () => {
  it("function", () => {
    expect(type(() => "")).toBe("function");
  });

  it("object", () => {
    expect(type({})).toBe("object");
  });

  it("array", () => {
    expect(type([])).toBe("array");
  });

  it("null", () => {
    expect(type(null)).toBe("null");
  });

  it("number", () => {
    expect(type(0.23)).toBe("number");
  });

  it("undefined", () => {
    expect(type(undefined)).toBe("undefined");
  });

  it("string", () => {
    expect(type("zhangbowang")).toBe("string");
  });
});
