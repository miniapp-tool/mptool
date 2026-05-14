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
});
