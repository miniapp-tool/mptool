import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { type } from "../src";

describe("type", () => {
  it("function", () => {
    expect(type(() => "")).toEqual("function");
  });

  it("object", () => {
    expect(type({})).toEqual("object");
  });

  it("array", () => {
    expect(type([])).toEqual("array");
  });

  it("null", () => {
    expect(type(null)).toEqual("null");
  });

  it("number", () => {
    expect(type(0.23)).toEqual("number");
  });

  it("undefined", () => {
    expect(type(undefined)).toEqual("undefined");
  });

  it("string", () => {
    expect(type("zhangbowang")).toEqual("string");
  });
});
