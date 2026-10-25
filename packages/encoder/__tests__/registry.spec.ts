import { describe, expect, it } from "vitest";

import { TextDecoder, TextEncoder, decoders, encoders } from "../src/index.js";

describe("encoder registries", () => {
  it("should be frozen after the built-in codecs are registered", () => {
    expect(Object.isFrozen(decoders)).toBe(true);
    expect(Object.isFrozen(encoders)).toBe(true);
    expect(Object.keys(encoders).sort()).toStrictEqual(["GBK", "UTF-8", "gb18030"]);
  });

  it("should reject runtime codec replacement", () => {
    expect(() => {
      // Replacing a codec is exactly what must fail at runtime
      encoders.GBK = encoders.UTF8;
    }).toThrow(TypeError);
  });

  it("should keep the registered codecs working", () => {
    expect(new TextEncoder("gbk").encode("中文")).toHaveLength(4);
    expect(new TextDecoder("gbk").decode(new Uint8Array([0xd6, 0xd0, 0xce, 0xc4]))).toBe("中文");
  });
});
