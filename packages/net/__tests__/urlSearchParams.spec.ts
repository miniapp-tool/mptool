import { describe, expect, it } from "vitest";
import { URLSearchParams } from "../src/urlSearchParams.js";

const getSimpleObj = (): URLSearchParams => new URLSearchParams("a=1&b=2&c=3");

const getKeyRepeatObj = (): URLSearchParams =>
  new URLSearchParams("id=xx&id=yy&id=zz&test=true");

describe("Constructor", () => {
  it("Construct with a search string", () => {
    const a = new URLSearchParams("?a=1&b=2");
    expect(a.toString()).to.be.equal("a=1&b=2");
  });

  it('Construct with a search string without "?"', () => {
    const a = new URLSearchParams("a=1&b=2");
    expect(a.toString()).to.be.equal("a=1&b=2");
  });

  it("Construct with an object", () => {
    const a = new URLSearchParams({
      a: 1,
      b: true,
      c: null,
      d: [],
      e: { f: "g" },
      f: "hello",
      g: ["a", "2", false],
      h: {
        toString: (): string => "h",
      },
    });

    expect(a.toString()).to.be.equal(
      "a=1&b=true&c=null&d=&e=%5Bobject+Object%5D&f=hello&g=a%2C2%2Cfalse&h=h",
    );
  });

  it("Construct an empty object", () => {
    const a = new URLSearchParams();
    expect(a.toString()).to.be.equal("");
    a.append("a", 1);
    expect(a.toString()).to.be.equal("a=1");
  });

  it("Construct with another URLSearchParams object", () => {
    const obj = getSimpleObj();
    const b = new URLSearchParams(obj);
    expect(b.toString()).to.be.equal(obj.toString());
  });

  it("Construct with a key without value", () => {
    const a = new URLSearchParams("a&b&c");
    expect(a.get("a")).to.be.equal("");
    expect(a.toString()).to.be.equal("a=&b=&c=");
  });

  it("Construct with a sequence", () => {
    const a = new URLSearchParams([
      ["foo", 1],
      ["bar", 2],
    ]);
    expect(a.get("foo")).to.be.equal("1");
  });

  it("Construct with an invalid sequence", () => {
    const badFunc = (): void => {
      const a = new URLSearchParams([["foo", 1], ["bar", 2], ["baz"]]);
      a.get("foo");
    };

    expect(badFunc).to.throw(TypeError);
  });

  it("Construct with an Object property", () => {
    const a = new URLSearchParams("hasOwnProperty=hop&toString=ts&prototype=p");

    expect(a.get("hasOwnProperty")).to.be.equal("hop");
    expect(a.get("toString")).to.be.equal("ts");
    expect(a.get("prototype")).to.be.equal("p");
  });
});

describe("Append data", () => {
  it("Append data", () => {
    const a = getSimpleObj();
    a.append("id", 1);
    expect(a.toString()).to.be.equal("a=1&b=2&c=3&id=1");
  });

  it("Append data with repetitive key", () => {
    const a = getSimpleObj();
    a.append("id", 1);
    a.append("id", 2);
    expect(a.toString()).to.be.equal("a=1&b=2&c=3&id=1&id=2");
  });
});

describe("Get data", () => {
  it("Get simple data", () => {
    const a = getSimpleObj();
    expect(a.get("a")).to.be.equal("1");
  });

  it("Get a boolean data, should return string", () => {
    const a = new URLSearchParams("a=true");
    expect(a.get("a")).to.be.equal("true");
  });

  it("Get data which from append", () => {
    const a = getSimpleObj();
    a.append("id", "xx");
    expect(a.get("id")).to.be.equal("xx");
  });

  it("Get data with repetitive key, should return the first one", () => {
    const a = getSimpleObj();
    a.append("id", "xx");
    a.append("id", "yy");
    expect(a.get("id")).to.be.equal("xx");
  });

  it("GetAll read simple data, should return an array", () => {
    const a = getSimpleObj();
    expect(a.getAll("a")).to.be.deep.equal(["1"]);
  });

  it("GetAll construct with an array value", () => {
    const a = new URLSearchParams("a[]=x&a[]=y");
    expect(a.getAll("a[]")).to.be.deep.equal(["x", "y"]);
  });

  it("GetAll read data with repetitive key, should return all data with same key", () => {
    const a = getKeyRepeatObj();
    expect(a.getAll("id")).to.be.deep.equal(["xx", "yy", "zz"]);
  });

  it("Get data with special keys", () => {
    const a = getSimpleObj();
    expect(a.get("hasOwnProperty")).to.be.equal(null);
    expect(a.getAll("hasOwnProperty").length).to.be.equal(0);
  });
});

describe("Delete data", () => {
  it("Remove simple data", () => {
    const a = getSimpleObj();
    a.delete("a");
    expect(a.toString()).to.be.equal("b=2&c=3");
  });

  it("Remove data with repetitive key", () => {
    const a = getKeyRepeatObj();
    a.delete("id");
    expect(a.toString()).to.be.equal("test=true");
  });

  it("Remove data which doesn't exists", () => {
    const a = getSimpleObj();
    a.delete("notExists");
    expect(a.toString()).to.be.equal("a=1&b=2&c=3");
  });
});

describe("Has check key exists", () => {
  it("Check the key exists", () => {
    const a = getSimpleObj();
    expect(a.has("a")).to.be.equal(true);
    expect(a.has("notExists")).to.be.equal(false);
    expect(a.has("hasOwnProperty")).to.be.equal(false);
  });
});

describe("Set data", () => {
  it("Set a new data", () => {
    const a = getSimpleObj();
    a.set("a", "xx");
    expect(a.toString()).to.be.equal("a=xx&b=2&c=3");
  });

  it("Set a nonexistent key", () => {
    const a = getSimpleObj();
    a.set("id", "xx");
    expect(a.toString()).to.be.equal("a=1&b=2&c=3&id=xx");
  });
});

describe("ForEach", () => {
  it("ForEach", () => {
    const a = getSimpleObj(),
      ret = {};

    a.forEach(function (item, name) {
      ret[name] = item;
    });

    expect(ret).to.be.deep.equal({
      a: "1",
      b: "2",
      c: "3",
    });
  });
});

describe("Iterator", () => {
  it("entries", () => {
    const obj = getSimpleObj(),
      ret = [];
    for (const p of obj.entries()) {
      ret.push(p[0] + "," + p[1]);
    }
    expect(ret.join(";")).to.be.equal("a,1;b,2;c,3");
  });

  it("for...of", () => {
    const obj = getSimpleObj(),
      ret = [];
    for (const p of obj) {
      ret.push(p[0] + "," + p[1]);
    }
    expect(ret.join(";")).to.be.equal("a,1;b,2;c,3");
  });

  it("keys", () => {
    const obj = getSimpleObj(),
      ret = [];
    for (const key of obj.keys()) {
      ret.push(key);
    }
    expect(ret.join(";")).to.be.equal("a;b;c");

    expect(Array.from(obj.keys())).to.be.eql(["a", "b", "c"]);
  });

  it("values", () => {
    const obj = getSimpleObj(),
      ret = [];
    for (const value of obj.values()) {
      ret.push(value);
    }
    expect(ret.join(";")).to.be.equal("1;2;3");

    expect(Array.from(obj.values())).to.be.eql(["1", "2", "3"]);
  });
});

describe("Sort", () => {
  it("Sort keys", () => {
    const obj = new URLSearchParams("q=flag&key=hello&s=world");
    obj.sort();
    expect(obj.toString()).to.be.equal("key=hello&q=flag&s=world");
  });
});

describe("Size", () => {
  it("Get size", () => {
    const a = new URLSearchParams("c=4&a=2&b=3&a=1");
    expect(a.size).to.be.equal(4);
    const b = new URLSearchParams("c=4&a=2&b=3");
    expect(b.size).to.be.equal(3);
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
    expect(a.toString()).to.be.equal(testStr);
  });

  it("URL decode", () => {
    const a = new URLSearchParams(testStr);
    const ret = {};

    a.forEach((value, key) => {
      ret[key] = value;
    });

    expect(ret).to.be.deep.equal(testObj);
  });
});
