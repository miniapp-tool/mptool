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
});
