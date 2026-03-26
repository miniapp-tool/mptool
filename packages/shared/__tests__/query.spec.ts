import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { query } from "../src";

const { parse, stringify, join } = query;

describe("queryParse", () => {
  it("parse normal", () => {
    const queryString = "a=2&aaoq12=asd8a9ij";
    const parsedQuery = parse(queryString);

    expect(parsedQuery.a).toEqual("2");
    expect(parsedQuery.aaoq12).toEqual("asd8a9ij");
  });

  it("parse with DIY spliter", () => {
    const queryString = "a=2/aaoq12=asd8a9ij";
    const parsedQuery = parse(queryString, "/");

    expect(parsedQuery.a).toEqual("2");
    expect(parsedQuery.aaoq12).toEqual("asd8a9ij");
  });
});

describe("queryStringify", () => {
  it("stringify normal", () => {
    const queryObj = {
      a: "1",
      mrhope: "handsome",
    };

    expect(stringify(queryObj)).toEqual("a=1&mrhope=handsome");
  });

  it("stringify with DIY spliter", () => {
    const queryObj = {
      a: "1",
      mrhope: "handsome",
    };

    expect(stringify(queryObj, "/")).toEqual("a=1/mrhope=handsome");
  });
});

describe("queryJoin", () => {
  it("join on complete path", () => {
    const path = "/page/main/main";
    const queryObj = {
      a: "1",
      mrhope: "handsome",
    };

    expect(join(path, queryObj)).toEqual("/page/main/main?a=1&mrhope=handsome");
  });

  it("join on path with query", () => {
    const path = "/page/main/main?mrhope=handsome";
    const queryObj = {
      a: "1",
      mrhope: "handsome",
    };

    expect(join(path, queryObj)).toEqual("/page/main/main?mrhope=handsome&a=1&mrhope=handsome");
  });

  it("join without query", () => {
    const path = "/page/main/main?mrhope=handsome";
    const queryObj = {};

    expect(join(path, queryObj)).toEqual("/page/main/main?mrhope=handsome");
  });
});
