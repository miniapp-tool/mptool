import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { query } from "../src";

const { parse, stringify, join } = query;

describe(parse, () => {
  it("parse normal", () => {
    const queryString = "a=2&test12=asd8a9ij";
    const parsedQuery = parse(queryString);

    expect(parsedQuery.a).toBe("2");
    expect(parsedQuery.test12).toBe("asd8a9ij");
  });

  it("parse with DIY splitter", () => {
    const queryString = "a=2/test12=asd8a9ij";
    const parsedQuery = parse(queryString, "/");

    expect(parsedQuery.a).toBe("2");
    expect(parsedQuery.test12).toBe("asd8a9ij");
  });

  it("parse should skip empty segments", () => {
    const parsedQuery = parse("a=1&&b=2&");

    expect(parsedQuery).toStrictEqual({ a: "1", b: "2" });
    expect("" in parsedQuery).toBe(false);
  });

  it("parse should use an empty string for valueless keys", () => {
    expect(parse("a")).toStrictEqual({ a: "" });
  });

  it("parse should keep everything after the first equals sign", () => {
    expect(parse("a=1=2")).toStrictEqual({ a: "1=2" });
  });

  it("parse should return an empty object for empty input", () => {
    expect(parse()).toStrictEqual({});
    expect(parse("")).toStrictEqual({});
  });

  it("parse should skip segments without a key", () => {
    expect(parse("=1&a=2")).toStrictEqual({ a: "2" });
  });
});

describe(stringify, () => {
  it("stringify normal", () => {
    const queryObj = {
      a: "1",
      hope: "handsome",
    };

    expect(stringify(queryObj)).toBe("a=1&hope=handsome");
  });

  it("stringify with DIY spliter", () => {
    const queryObj = {
      a: "1",
      hope: "handsome",
    };

    expect(stringify(queryObj, "/")).toBe("a=1/hope=handsome");
  });

  it("stringify should return an empty string without params", () => {
    expect(stringify()).toBe("");
  });

  it("stringify should keep values unencoded when requested", () => {
    expect(stringify({ a: "1 2" }, "&", true)).toBe("a=1 2");
  });
});

describe(join, () => {
  it("join on complete path", () => {
    const path = "/page/main/main";
    const queryObj = {
      a: "1",
      hope: "handsome",
    };

    expect(join(path, queryObj)).toBe("/page/main/main?a=1&hope=handsome");
  });

  it("join on path with query", () => {
    const path = "/page/main/main?hope=handsome";
    const queryObj = {
      a: "1",
      hope: "handsome",
    };

    expect(join(path, queryObj)).toBe("/page/main/main?hope=handsome&a=1&hope=handsome");
  });

  it("join without query", () => {
    const path = "/page/main/main?hope=handsome";
    const queryObj = {};

    expect(join(path, queryObj)).toBe("/page/main/main?hope=handsome");
  });

  it("join on path ending with a question mark", () => {
    expect(join("/page/main/main?", { a: "1" })).toBe("/page/main/main?a=1");
  });

  it("join on path ending with an ampersand", () => {
    expect(join("/page/main/main&", { a: "1" })).toBe("/page/main/main&a=1");
  });

  it("join unencoded query", () => {
    expect(join("/page/main/main", { a: "1 2" }, true)).toBe("/page/main/main?a=1 2");
  });
});
