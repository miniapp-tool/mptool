import { describe, expect, it } from "vitest";

import { TextDecoder, TextEncoder } from "../src/index.js";

const octets = (...values: number[]): Uint8Array => Uint8Array.from(values);

const decode = (bytes: number[], fatal = false): string =>
  new TextDecoder("gb18030", { fatal }).decode(Uint8Array.from(bytes));

const encode = (content: string, label = "gb18030"): number[] => [
  ...new TextEncoder(label).encode(content),
];

describe("gb18030 decoder single-byte paths", () => {
  it("decodes ASCII bytes unchanged", () => {
    expect(decode([0x41, 0x7f])).toBe("A\u007F");
  });

  it("decodes the single-byte euro sign", () => {
    expect(decode([0x80])).toBe("€");
  });

  it("replaces bytes that no mapping covers", () => {
    expect(decode([0xff])).toBe("\uFFFD");
  });
});

describe("gb18030 decoder two-byte errors", () => {
  it("re-emits a trailing ASCII byte after a truncated lead byte", () => {
    // 0x81 announces a two-byte sequence, but 0x20 cannot be a trail byte, so it is decoded on its
    // own after the replacement character.
    expect(decode([0x81, 0x20, 0x41])).toBe("\uFFFD A");
  });

  it("drops a trailing non-ASCII byte that is not a valid trail byte", () => {
    expect(decode([0x81, 0xff])).toBe("\uFFFD");
  });

  it("throws in fatal mode", () => {
    expect(() => decode([0x81, 0xff], true)).toThrow(TypeError);
    expect(() => decode([0xff], true)).toThrow(TypeError);
  });
});

describe("gb18030 decoder truncated input", () => {
  it("emits a replacement character for a dangling lead byte", () => {
    expect(decode([0x81])).toBe("\uFFFD");
  });

  it("emits a replacement character for a pending second byte", () => {
    expect(decode([0x81, 0x30])).toBe("\uFFFD");
  });

  it("emits a replacement character for a pending third byte", () => {
    expect(decode([0x81, 0x30, 0x81])).toBe("\uFFFD");
  });

  it("throws in fatal mode", () => {
    expect(() => decode([0x81], true)).toThrow(TypeError);
    expect(() => decode([0x81, 0x30], true)).toThrow(TypeError);
    expect(() => decode([0x81, 0x30, 0x81], true)).toThrow(TypeError);
  });
});

describe("gb18030 decoder four-byte sequences", () => {
  it("decodes the lowest pointer through the ranges table", () => {
    // pointer 0 → U+0080, which exercises the range lookup on a pointer that matches only the
    // first ranges entry.
    expect(decode([0x81, 0x30, 0x81, 0x30])).toBe("\u0080");
  });

  it("uses the U+E7C7 special case for pointer 7457", () => {
    expect(decode([0x81, 0x35, 0xf4, 0x37])).toBe("\uE7C7");
  });

  it("rejects pointers inside the unmapped gap", () => {
    // pointer 50000 sits between 39419 and 189000, which the ranges table rejects.
    expect(decode([0x84, 0x39, 0xd7, 0x30])).toBe("\uFFFD9\uFFFD");
  });

  it("rejects pointers above 1237575", () => {
    expect(decode([0xfe, 0x39, 0xfe, 0x39])).toBe("\uFFFD9\uFFFD");
  });

  it("prepends the trailing bytes of a four-byte sequence with a bad third byte", () => {
    // The fourth byte must be a digit; otherwise the three consumed bytes are re-decoded, here as
    // the replacement character followed by the valid two-byte sequence 0x81 0x41.
    expect(decode([0x81, 0x30, 0x81, 0x41])).toBe("\uFFFD0\u4E04");
  });

  it("re-emits the second byte when the third byte is not a lead byte", () => {
    expect(decode([0x81, 0x30, 0x41])).toBe("\uFFFD0A");
  });

  it("throws in fatal mode", () => {
    expect(() => decode([0x81, 0x30, 0x81, 0x41], true)).toThrow(TypeError);
    expect(() => decode([0x84, 0x39, 0xd7, 0x30], true)).toThrow(TypeError);
  });
});

describe("gb18030 encoder", () => {
  it("encodes ASCII code points unchanged", () => {
    expect(encode("A")).toStrictEqual([0x41]);
  });

  it("encodes supplementary code points through the ranges table", () => {
    expect(encode("💩")).toStrictEqual([148, 57, 218, 51]);
    expect(decode(encode("💩"))).toBe("💩");
  });

  it("encodes code points missing from the two-byte index through the ranges table", () => {
    expect(encode("\uFFFE")).toStrictEqual([0x84, 0x31, 0xa4, 0x38]);
    expect(decode(encode("\uFFFE"))).toBe("\uFFFE");
  });

  it("maps U+E7C7 to pointer 7457", () => {
    expect(encode("\uE7C7")).toStrictEqual([0x81, 0x35, 0xf4, 0x37]);
  });

  it("rejects U+E5E5, which is deliberately unmapped", () => {
    expect(() => encode("\uE5E5")).toThrow(TypeError);
  });

  it("encodes the euro sign as 0x80 when the GBK flag is set", () => {
    expect(encode("€", "gbk")).toStrictEqual([0x80]);
    expect(decode(encode("€", "gbk"))).toBe("\u20AC");
  });

  it("rejects code points that GBK cannot encode", () => {
    expect(() => encode("💩", "gbk")).toThrow(TypeError);
    expect(() => encode("\uE7C7", "gbk")).toThrow(TypeError);
  });

  it("round-trips the gb18030 euro sign", () => {
    const encoded = octets(...encode("€"));

    expect(new TextDecoder("gb18030").decode(encoded)).toBe("€");
  });
});
