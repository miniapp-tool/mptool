import { describe, expect, it } from "vitest";

import { URLSearchParams } from "../src/urlSearchParams.js";

const getSimpleObj = (): URLSearchParams => new URLSearchParams("a=1&b=2&c=3");

const getKeyRepeatObj = (): URLSearchParams => new URLSearchParams("id=xx&id=yy&id=zz&test=true");

describe(URLSearchParams, () => {
  describe("constructor", () => {
    it("construct with a search string", () => {
      const a = new URLSearchParams("?a=1&b=2");

      expect(a.toString()).toBe("a=1&b=2");
    });

    it('construct with a search string without "?"', () => {
      const a = new URLSearchParams("a=1&b=2");

      expect(a.toString()).toBe("a=1&b=2");
    });

    it("construct with an object", () => {
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

      expect(a.toString()).toBe(
        "a=1&b=true&c=null&d=&e=%5Bobject+Object%5D&f=hello&g=a%2C2%2Cfalse&h=h",
      );
    });

    it("construct an empty object", () => {
      const a = new URLSearchParams();

      expect(a.toString()).toBe("");
      // @ts-expect-error: non-standard value
      a.append("a", 1);
      expect(a.toString()).toBe("a=1");
    });

    it("construct with another URLSearchParams object", () => {
      const obj = getSimpleObj();
      const b = new URLSearchParams(obj);

      expect(b.toString()).toStrictEqual(obj.toString());
    });

    it("construct with a key without value", () => {
      const a = new URLSearchParams("a&b&c");

      expect(a.get("a")).toBe("");
      expect(a.toString()).toBe("a=&b=&c=");
    });

    it("construct with an empty name but a value", () => {
      const a = new URLSearchParams("=v");

      expect(a.get("")).toBe("v");
      expect(a.toString()).toBe("=v");
    });

    it("serializes a NUL character as %00", () => {
      const a = new URLSearchParams([["a", "\u0000"]]);

      expect(a.toString()).toBe("a=%00");
    });

    it("construct ignoring empty pairs", () => {
      const a = new URLSearchParams("a&&b");

      expect(a.toString()).toBe("a=&b=");
    });

    it("construct with a sequence", () => {
      const a = new URLSearchParams([
        // @ts-expect-error: non-standard value
        ["foo", 1],
        // @ts-expect-error: non-standard value
        ["bar", 2],
      ]);

      expect(a.get("foo")).toBe("1");
    });

    it("construct with an invalid sequence", () => {
      const badFunc = (): void => {
        // @ts-expect-error: non-standard value
        const a = new URLSearchParams([["foo", 1], ["bar", 2], ["baz"]]);

        a.get("foo");
      };

      expect(badFunc).toThrow(TypeError);
    });

    it("construct with an Object property", () => {
      const a = new URLSearchParams("hasOwnProperty=hop&toString=ts&prototype=p");

      expect(a.get("hasOwnProperty")).toBe("hop");
      expect(a.get("toString")).toBe("ts");
      expect(a.get("prototype")).toBe("p");
    });
  });

  describe("append data", () => {
    it("append data", () => {
      const a = getSimpleObj();

      // @ts-expect-error: non-standard value
      a.append("id", 1);
      expect(a.toString()).toBe("a=1&b=2&c=3&id=1");
    });

    it("append data with repetitive key", () => {
      const a = getSimpleObj();

      // @ts-expect-error: non-standard value
      a.append("id", 1);
      // @ts-expect-error: non-standard value
      a.append("id", 2);
      expect(a.toString()).toBe("a=1&b=2&c=3&id=1&id=2");
    });
  });

  describe("get data", () => {
    it("get simple data", () => {
      const a = getSimpleObj();

      expect(a.get("a")).toBe("1");
    });

    it("get a boolean data, should return string", () => {
      const a = new URLSearchParams("a=true");

      expect(a.get("a")).toBe("true");
    });

    it("get data which from append", () => {
      const a = getSimpleObj();

      a.append("id", "xx");
      expect(a.get("id")).toBe("xx");
    });

    it("get data with repetitive key, should return the first one", () => {
      const a = getSimpleObj();

      a.append("id", "xx");
      a.append("id", "yy");
      expect(a.get("id")).toBe("xx");
    });

    it("getAll read simple data, should return an array", () => {
      const a = getSimpleObj();

      expect(a.getAll("a")).toStrictEqual(["1"]);
    });

    it("getAll construct with an array value", () => {
      const a = new URLSearchParams("a[]=x&a[]=y");

      expect(a.getAll("a[]")).toStrictEqual(["x", "y"]);
    });

    it("getAll read data with repetitive key, should return all data with same key", () => {
      const a = getKeyRepeatObj();

      expect(a.getAll("id")).toStrictEqual(["xx", "yy", "zz"]);
    });

    it("get data with special keys", () => {
      const a = getSimpleObj();

      expect(a.get("hasOwnProperty")).toBeNull();
      expect(a.getAll("hasOwnProperty")).toHaveLength(0);
    });
  });

  describe("delete data", () => {
    it("remove simple data", () => {
      const a = getSimpleObj();

      a.delete("a");
      expect(a.toString()).toBe("b=2&c=3");
    });

    it("remove data with repetitive key", () => {
      const a = getKeyRepeatObj();

      a.delete("id");
      expect(a.toString()).toBe("test=true");
    });

    it("remove data which doesn't exists", () => {
      const a = getSimpleObj();

      a.delete("notExists");
      expect(a.toString()).toBe("a=1&b=2&c=3");
    });

    it("remove data with the given value only", () => {
      const a = new URLSearchParams("a=1&a=2&b=3");

      a.delete("a", "2");
      expect(a.toString()).toBe("a=1&b=3");
    });
  });

  describe("has check key exists", () => {
    it("check the key exists", () => {
      const a = getSimpleObj();

      expect(a.has("a")).toBe(true);
      expect(a.has("notExists")).toBe(false);
      expect(a.has("hasOwnProperty")).toBe(false);
    });
  });

  describe("set data", () => {
    it("set a new data", () => {
      const a = getSimpleObj();

      a.set("a", "xx");
      expect(a.toString()).toBe("a=xx&b=2&c=3");
    });

    it("set a nonexistent key", () => {
      const a = getSimpleObj();

      a.set("id", "xx");
      expect(a.toString()).toBe("a=1&b=2&c=3&id=xx");
    });

    it("set keeps the first pair position and removes the rest", () => {
      const a = new URLSearchParams("a=1&b=2&a=3");

      a.set("a", "x");
      expect(a.toString()).toBe("a=x&b=2");
    });
  });

  describe("forEach", () => {
    it("forEach", () => {
      const a = getSimpleObj();
      const result: Record<string, string> = {};

      a.forEach((item, name) => {
        result[name] = item;
      });

      expect(result).toStrictEqual({
        a: "1",
        b: "2",
        c: "3",
      });
    });
  });

  describe("iterator", () => {
    it("entries", () => {
      const obj = getSimpleObj(),
        ret: string[] = [];

      for (const p of obj.entries()) ret.push(`${p[0]},${p[1]}`);

      expect(ret.join(";")).toBe("a,1;b,2;c,3");
    });

    it("for...of", () => {
      const obj = getSimpleObj(),
        ret: string[] = [];

      for (const p of obj) ret.push(`${p[0]},${p[1]}`);

      expect(ret.join(";")).toBe("a,1;b,2;c,3");
    });

    it("keys", () => {
      const obj = getSimpleObj(),
        ret: string[] = [];

      for (const key of obj.keys()) ret.push(key);

      expect(ret.join(";")).toBe("a;b;c");

      expect([...obj.keys()]).toStrictEqual(["a", "b", "c"]);
    });

    it("keys with duplicate names", () => {
      const obj = new URLSearchParams("a=1&a=2&b=3");

      expect([...obj.keys()]).toStrictEqual(["a", "a", "b"]);
    });

    it("entries preserve interleaved pair order", () => {
      const obj = new URLSearchParams("a=1&b=2&a=3");

      expect([...obj.entries()]).toStrictEqual([
        ["a", "1"],
        ["b", "2"],
        ["a", "3"],
      ]);
      expect(obj.toString()).toBe("a=1&b=2&a=3");
    });

    it("values", () => {
      const obj = getSimpleObj(),
        ret: string[] = [];

      for (const value of obj.values()) ret.push(value);

      expect(ret.join(";")).toBe("1;2;3");

      expect([...obj.values()]).toStrictEqual(["1", "2", "3"]);
    });

    it("values with duplicate keys", () => {
      const obj = new URLSearchParams("a=1&a=1&b=2");

      expect([...obj.values()]).toStrictEqual(["1", "1", "2"]);
    });
  });

  describe("sort", () => {
    it("sort keys", () => {
      const obj = new URLSearchParams("q=flag&key=hello&s=world");

      obj.sort();
      expect(obj.toString()).toBe("key=hello&q=flag&s=world");
    });

    it("sort uses code unit order", () => {
      const obj = new URLSearchParams("a=1&A=2&z=3&_=4");

      obj.sort();
      expect(obj.toString()).toBe("A=2&_=4&a=1&z=3");
    });

    it("sort keeps relative order of duplicate names", () => {
      const obj = new URLSearchParams("query[]=abc&type=search&query[]=123");

      obj.sort();
      expect(obj.toString()).toBe("query%5B%5D=abc&query%5B%5D=123&type=search");
    });
  });

  describe("size", () => {
    it("get size", () => {
      const a = new URLSearchParams("c=4&a=2&b=3&a=1");

      expect(a.size).toBe(4);
      const b = new URLSearchParams("c=4&a=2&b=3");

      expect(b.size).toBe(3);
    });
  });

  describe("others", () => {
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

    it("uRL encode", () => {
      const a = new URLSearchParams(testObj);

      expect(a.toString()).toStrictEqual(testStr);
    });

    it("uRL decode", () => {
      const a = new URLSearchParams(testStr);
      const result: Record<string, string> = {};

      a.forEach((value, key) => {
        result[key] = value;
      });

      expect(result).toStrictEqual(testObj);
    });
  });

  describe("decode tolerates malformed percent-encoding", () => {
    it("keeps a trailing percent sign", () => {
      const a = new URLSearchParams("p=%");

      expect(a.get("p")).toBe("%");
    });

    it("keeps a percent sign without hex digits", () => {
      const a = new URLSearchParams("p=%zz");

      expect(a.get("p")).toBe("%zz");
    });

    it("keeps a lone percent sign", () => {
      const a = new URLSearchParams("p=100%");

      expect(a.get("p")).toBe("100%");
    });

    it("decodes valid UTF-8 sequences", () => {
      const a = new URLSearchParams("p=%E4%B8%AD");

      expect(a.get("p")).toBe("中");
    });

    it("replaces a truncated UTF-8 sequence with U+FFFD", () => {
      const a = new URLSearchParams("p=%E4%B8");

      expect(a.get("p")).toBe("\uFFFD");
    });

    it("mixes decoded and replacement characters", () => {
      const a = new URLSearchParams("p=%E4%B8%AD%E4%B8");

      expect(a.get("p")).toBe("中\uFFFD");
    });
  });
});
