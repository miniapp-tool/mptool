import "@mptool/mock";
import { query } from "../src";

const { parse, stringify, join } = query;

describe("queryParse", () => {
  it("parse normal", () => {
    const queryString = "a=2&aaoq12=asd8a9ij";
    const query = parse(queryString);

    expect(query.a).toEqual("2");
    expect(query.aaoq12).toEqual("asd8a9ij");
  });

  it("parse with DIY spliter", () => {
    const queryString = "a=2/aaoq12=asd8a9ij";
    const query = parse(queryString, "/");

    expect(query.a).toEqual("2");
    expect(query.aaoq12).toEqual("asd8a9ij");
  });
});

describe("queryStringify", () => {
  it("stringify normal", () => {
    const query = {
      a: "1",
      mrhope: "handsome",
    };

    expect(stringify(query)).toEqual("a=1&mrhope=handsome");
  });

  it("stringify with DIY spliter", () => {
    const query = {
      a: "1",
      mrhope: "handsome",
    };

    expect(stringify(query, "/")).toEqual("a=1/mrhope=handsome");
  });
});

describe("queryJoin", () => {
  it("join on complete path", () => {
    const path = "/page/main/main";
    const query = {
      a: "1",
      mrhope: "handsome",
    };

    expect(join(path, query)).toEqual("/page/main/main?a=1&mrhope=handsome");
  });

  it("join on path with query", () => {
    const path = "/page/main/main?mrhope=handsome";
    const query = {
      a: "1",
      mrhope: "handsome",
    };

    expect(join(path, query)).toEqual(
      "/page/main/main?mrhope=handsome&a=1&mrhope=handsome"
    );
  });

  it("join without query", () => {
    const path = "/page/main/main?mrhope=handsome";
    const query = {};

    expect(join(path, query)).toEqual("/page/main/main?mrhope=handsome");
  });
});
