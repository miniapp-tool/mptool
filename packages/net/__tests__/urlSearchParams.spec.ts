import { describe, expect, it } from "vitest";

import { URLSearchParams } from "../src/urlSearchParams.js";

const getSimpleObj = (): URLSearchParams => new URLSearchParams("a=1&b=2&c=3");

const getKeyRepeatObj = (): URLSearchParams => new URLSearchParams("id=xx&id=yy&id=zz&test=true");

describe("Constructor", () => {
  it("Construct with a search string", () => {
    const a = new URLSearchParams("?a=1&b=2");

    expect(a.toString()).toEqual("a=1&b=2");
  });

  it('Construct with a search string without "?"', () => {
    const a = new URLSearchParams("a=1&b=2");

    expect(a.toString()).toEqual("a=1&b=2");
  });

  it("Construct with an object", () => {
    const a = new URLSearchParams({
      // @ts-expect-error: non-standard value
      a: 1,
      // @ts-expect-error: non-standard value
      b: true,
      // @ts-expect-error: non-standard value
      c: null,
      d: [],
      // @ts-expect-error: non-standard value
      e: { f: "g" },
      f: "hello",
      // @ts-expect-error: non-standard value
      g: ["a", "2", false],
      // @ts-expect-error: non-standard value
      h: {
        toString: (): string => "h",
      },
    });

    expect(a.toString()).toEqual(
      "a=1&b=true&c=null&d=&e=%5Bobject+Object%5D&f=hello&g=a%2C2%2Cfalse&h=h",
    );
  });

  it("Construct an empty object", () => {
    const a = new URLSearchParams();

    expect(a.toString()).toEqual("");
    // @ts-expect-error: non-standard value
    a.append("a", 1);
    expect(a.toString()).toEqual("a=1");
  });

  it("Construct with another URLSearchParams object", () => {
    const obj = getSimpleObj();
    const b = new URLSearchParams(obj);

    expect(b.toString()).toEqual(obj.toString());
  });

  it("Construct with a key without value", () => {
    const a = new URLSearchParams("a&b&c");

    expect(a.get("a")).toEqual("");
    expect(a.toString()).toEqual("a=&b=&c=");
  });

  it("Construct with a sequence", () => {
    const a = new URLSearchParams([
      // @ts-expect-error: non-standard value
      ["foo", 1],
      // @ts-expect-error: non-standard value
      ["bar", 2],
    ]);

    expect(a.get("foo")).toEqual("1");
  });

  it("Construct with an invalid sequence", () => {
    const badFunc = (): void => {
      // @ts-expect-error: non-standard value
      const a = new URLSearchParams([["foo", 1], ["bar", 2], ["baz"]]);

      a.get("foo");
    };

    expect(badFunc).toThrow(TypeError);
  });

  it("Construct with an Object property", () => {
    const a = new URLSearchParams("hasOwnProperty=hop&toString=ts&prototype=p");

    expect(a.get("hasOwnProperty")).toEqual("hop");
    expect(a.get("toString")).toEqual("ts");
    expect(a.get("prototype")).toEqual("p");
  });
});

describe("Append data", () => {
  it("Append data", () => {
    const a = getSimpleObj();

    // @ts-expect-error: non-standard value
    a.append("id", 1);
    expect(a.toString()).toEqual("a=1&b=2&c=3&id=1");
  });

  it("Append data with repetitive key", () => {
    const a = getSimpleObj();

    // @ts-expect-error: non-standard value
    a.append("id", 1);
    // @ts-expect-error: non-standard value
    a.append("id", 2);
    expect(a.toString()).toEqual("a=1&b=2&c=3&id=1&id=2");
  });
});

describe("Get data", () => {
  it("Get simple data", () => {
    const a = getSimpleObj();

    expect(a.get("a")).toEqual("1");
  });

  it("Get a boolean data, should return string", () => {
    const a = new URLSearchParams("a=true");

    expect(a.get("a")).toEqual("true");
  });

  it("Get data which from append", () => {
    const a = getSimpleObj();

    a.append("id", "xx");
    expect(a.get("id")).toEqual("xx");
  });

  it("Get data with repetitive key, should return the first one", () => {
    const a = getSimpleObj();

    a.append("id", "xx");
    a.append("id", "yy");
    expect(a.get("id")).toEqual("xx");
  });

  it("GetAll read simple data, should return an array", () => {
    const a = getSimpleObj();

    expect(a.getAll("a")).toEqual(["1"]);
  });

  it("GetAll construct with an array value", () => {
    const a = new URLSearchParams("a[]=x&a[]=y");

    expect(a.getAll("a[]")).toEqual(["x", "y"]);
  });

  it("GetAll read data with repetitive key, should return all data with same key", () => {
    const a = getKeyRepeatObj();

    expect(a.getAll("id")).toEqual(["xx", "yy", "zz"]);
  });

  it("Get data with special keys", () => {
    const a = getSimpleObj();

    expect(a.get("hasOwnProperty")).toEqual(null);
    expect(a.getAll("hasOwnProperty").length).toEqual(0);
  });
});

describe("Delete data", () => {
  it("Remove simple data", () => {
    const a = getSimpleObj();

    a.delete("a");
    expect(a.toString()).toEqual("b=2&c=3");
  });

  it("Remove data with repetitive key", () => {
    const a = getKeyRepeatObj();

    a.delete("id");
    expect(a.toString()).toEqual("test=true");
  });

  it("Remove data which doesn't exists", () => {
    const a = getSimpleObj();

    a.delete("notExists");
    expect(a.toString()).toEqual("a=1&b=2&c=3");
  });
});

describe("Has check key exists", () => {
  it("Check the key exists", () => {
    const a = getSimpleObj();

    expect(a.has("a")).toEqual(true);
    expect(a.has("notExists")).toEqual(false);
    expect(a.has("hasOwnProperty")).toEqual(false);
  });
});

describe("Set data", () => {
  it("Set a new data", () => {
    const a = getSimpleObj();

    a.set("a", "xx");
    expect(a.toString()).toEqual("a=xx&b=2&c=3");
  });

  it("Set a nonexistent key", () => {
    const a = getSimpleObj();

    a.set("id", "xx");
    expect(a.toString()).toEqual("a=1&b=2&c=3&id=xx");
  });
});

describe("ForEach", () => {
  it("ForEach", () => {
    const a = getSimpleObj();
    const result: Record<string, string> = {};

    a.forEach((item, name) => {
      result[name] = item;
    });

    expect(result).toEqual({
      a: "1",
      b: "2",
      c: "3",
    });
  });
});

describe("Iterator", () => {
  it("entries", () => {
    const obj = getSimpleObj(),
      ret: string[] = [];

    for (const p of obj.entries()) ret.push(`${p[0]},${p[1]}`);

    expect(ret.join(";")).toEqual("a,1;b,2;c,3");
  });

  it("for...of", () => {
    const obj = getSimpleObj(),
      ret: string[] = [];

    for (const p of obj) ret.push(`${p[0]},${p[1]}`);

    expect(ret.join(";")).toEqual("a,1;b,2;c,3");
  });

  it("keys", () => {
    const obj = getSimpleObj(),
      ret: string[] = [];

    for (const key of obj.keys()) ret.push(key);

    expect(ret.join(";")).toEqual("a;b;c");

    expect([...obj.keys()]).toEqual(["a", "b", "c"]);
  });

  it("values", () => {
    const obj = getSimpleObj(),
      ret: string[] = [];

    for (const value of obj.values()) ret.push(value);

    expect(ret.join(";")).toEqual("1;2;3");

    expect([...obj.values()]).toEqual(["1", "2", "3"]);
  });
});

describe("Sort", () => {
  it("Sort keys", () => {
    const obj = new URLSearchParams("q=flag&key=hello&s=world");

    obj.sort();
    expect(obj.toString()).toEqual("key=hello&q=flag&s=world");
  });
});

describe("Size", () => {
  it("Get size", () => {
    const a = new URLSearchParams("c=4&a=2&b=3&a=1");

    expect(a.size).toEqual(4);
    const b = new URLSearchParams("c=4&a=2&b=3");

    expect(b.size).toEqual(3);
  });
});

describe("Others", () => {
  const testObj = {
    a: "你好",
    b: "<script>",
    c: "http://a.com/?c=7&d=8#!/asd",
    d: "hello world",
    e: "+",
    f: "/%^^%zz%%%world你好",
  };

  const testStr =
    "a=%E4%BD%A0%E5%A5%BD&b=%3Cscript%3E&c=http%3A%2F%2Fa.com%2F%3Fc%3D7%26d%3D8%23%21%2Fasd&d=hello+world&e=%2B&f=%2F%25%5E%5E%25zz%25%25%25world%E4%BD%A0%E5%A5%BD";

  it("URL encode", () => {
    const a = new URLSearchParams(testObj);

    expect(a.toString()).toEqual(testStr);
  });

  it("URL decode", () => {
    const a = new URLSearchParams(testStr);
    const result: Record<string, string> = {};

    a.forEach((value, key) => {
      result[key] = value;
    });

    expect(result).toEqual(testObj);
  });
});
