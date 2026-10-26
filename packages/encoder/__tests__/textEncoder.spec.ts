import { describe, expect, it } from "vitest";

import { TextDecoder, TextEncoder } from "../src/index.js";

const bytes = (value: Uint8Array): number[] => [...value];

describe(TextEncoder, () => {
  it("encodes UTF-8 by default", () => {
    const encoder = new TextEncoder();

    expect(encoder.encoding).toBe("utf-8");
    expect(bytes(encoder.encode("中文"))).toStrictEqual([0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87]);
  });

  it("encodes GBK when a GBK label is given", () => {
    const encoder = new TextEncoder("gbk");

    expect(encoder.encoding).toBe("gbk");
    expect(bytes(encoder.encode("中文"))).toStrictEqual([0xd6, 0xd0, 0xce, 0xc4]);
  });

  it("supports GB2312 as a GBK label", () => {
    expect(bytes(new TextEncoder("gb2312").encode("中文"))).toStrictEqual([0xd6, 0xd0, 0xce, 0xc4]);
  });

  it("supports GB18030", () => {
    expect(bytes(new TextEncoder("gb18030").encode("中文"))).toStrictEqual([
      0xd6, 0xd0, 0xce, 0xc4,
    ]);
  });

  it("round-trips GBK through the matching decoder", () => {
    const encoded = new TextEncoder("gbk").encode("微信小程序");

    expect(new TextDecoder("gbk").decode(encoded)).toBe("微信小程序");
  });

  it("encodes GBK consistently across repeated encodes", () => {
    // The first call builds the reverse lookup map lazily; later calls must reuse it and return
    // the same bytes.
    const text = "微信小程序".repeat(2000);
    const encoder = new TextEncoder("gbk");
    const first = encoder.encode(text);
    const second = encoder.encode(text);

    expect(bytes(second)).toStrictEqual(bytes(first));
    expect(new TextDecoder("gbk").decode(first)).toBe(text);
  });

  it("encodes supplementary code points through the GB18030 ranges", () => {
    expect(bytes(new TextEncoder("gb18030").encode("💩"))).toStrictEqual([148, 57, 218, 51]);
  });

  it("throws a RangeError for an unknown label", () => {
    expect(() => new TextEncoder("not-an-encoding")).toThrow(RangeError);
  });

  it("encodes an empty string when called without arguments", () => {
    expect(bytes(new TextEncoder().encode())).toStrictEqual([]);
  });

  it("accepts the fatal option", () => {
    // Encoders never replace, so the flag only has to be accepted and stored.
    expect(bytes(new TextEncoder("utf-8", { fatal: true }).encode("A"))).toStrictEqual([0x41]);
  });

  it("encodes ASCII unchanged", () => {
    expect(bytes(new TextEncoder("gbk").encode("A\u007F"))).toStrictEqual([0x41, 0x7f]);
  });

  it("supports non-standard streaming encodes", () => {
    const encoder = new TextEncoder("gbk");

    expect(bytes(encoder.encode("中", { stream: true }))).toStrictEqual([0xd6, 0xd0]);
    expect(bytes(encoder.encode("文"))).toStrictEqual([0xce, 0xc4]);
  });

  it("rejects U+E5E5 for every encoding", () => {
    expect(() => new TextEncoder("gb18030").encode("\uE5E5")).toThrow(TypeError);
    expect(() => new TextEncoder("gbk").encode("\uE5E5")).toThrow(TypeError);
  });

  it("rejects code points that GBK cannot encode", () => {
    expect(() => new TextEncoder("gbk").encode("💩")).toThrow(TypeError);
    expect(() => new TextEncoder("gbk").encode("\uFFFE")).toThrow(TypeError);
  });

  it("encodes the euro sign as 0x80 under a GBK label", () => {
    expect(bytes(new TextEncoder("gbk").encode("€"))).toStrictEqual([0x80]);
  });

  it("round-trips the euro sign through gb18030", () => {
    const encoded = new TextEncoder("gb18030").encode("€");

    expect(new TextDecoder("gb18030").decode(encoded)).toBe("€");
  });
});
