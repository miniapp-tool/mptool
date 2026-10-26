import { describe, expect, it } from "vitest";

import { TextDecoder } from "../src/index.js";

const octets = (...values: number[]): Uint8Array => Uint8Array.from(values);

describe("textDecoder API", () => {
  it("defaults to UTF-8 with both flags unset", () => {
    const decoder = new TextDecoder();

    expect(decoder.encoding).toBe("utf-8");
    expect(decoder.fatal).toBe(false);
    expect(decoder.ignoreBOM).toBe(false);
  });

  it("exposes the fatal and ignoreBOM options", () => {
    const decoder = new TextDecoder("GBK", { fatal: true, ignoreBOM: true });

    expect(decoder.encoding).toBe("gbk");
    expect(decoder.fatal).toBe(true);
    expect(decoder.ignoreBOM).toBe(true);
  });

  it("normalizes the encoding label", () => {
    expect(new TextDecoder("  GB18030  ").encoding).toBe("gb18030");
  });

  it("throws a RangeError for an unknown label", () => {
    expect(() => new TextDecoder("not-an-encoding")).toThrow(RangeError);
    expect(() => new TextDecoder("replacement")).toThrow(RangeError);
  });

  it("decodes an ArrayBuffer", () => {
    const buffer = new ArrayBuffer(2);

    new Uint8Array(buffer).set([0x41, 0x42]);

    expect(new TextDecoder().decode(buffer)).toBe("AB");
  });

  it("decodes a view using byteOffset and byteLength", () => {
    const backing = octets(0x00, 0x41, 0x42, 0x00);

    expect(new TextDecoder().decode(backing.subarray(1, 3))).toBe("AB");
    expect(new TextDecoder().decode(new DataView(backing.buffer, 1, 2))).toBe("AB");
  });

  it("returns an empty string when the input is omitted", () => {
    expect(new TextDecoder().decode(undefined as unknown as ArrayBuffer)).toBe("");
  });

  it("returns an empty string for empty input", () => {
    expect(new TextDecoder().decode(new Uint8Array(0))).toBe("");
  });
});

describe("textDecoder BOM handling", () => {
  it("strips a leading UTF-8 BOM", () => {
    expect(new TextDecoder().decode(octets(0xef, 0xbb, 0xbf, 0x41))).toBe("A");
  });

  it("strips a BOM-only input down to an empty string", () => {
    expect(new TextDecoder().decode(octets(0xef, 0xbb, 0xbf))).toBe("");
  });

  it("keeps the BOM when ignoreBOM is set", () => {
    expect(
      new TextDecoder("utf-8", { ignoreBOM: true }).decode(octets(0xef, 0xbb, 0xbf, 0x41)),
    ).toBe("\uFEFFA");
  });

  it("only treats U+FEFF as a BOM at the start of the stream", () => {
    expect(new TextDecoder().decode(octets(0x41, 0xef, 0xbb, 0xbf))).toBe("A\uFEFF");
  });
});

describe("textDecoder streaming", () => {
  it("keeps GBK decoder state across chunks", () => {
    const decoder = new TextDecoder("gbk");

    // The lead byte of 中 arrives in the first chunk, its trail byte in the second one.
    expect(decoder.decode(octets(0xd6), { stream: true })).toBe("");
    expect(decoder.decode(octets(0xd0), { stream: true })).toBe("中");
    expect(decoder.decode(octets(0xce, 0xc4))).toBe("文");
  });

  it("keeps UTF-8 decoder state across chunks", () => {
    const decoder = new TextDecoder();

    expect(decoder.decode(octets(0xe4, 0xb8), { stream: true })).toBe("");
    expect(decoder.decode(octets(0xad), { stream: true })).toBe("中");
    // Flushing an empty tail ends the stream and resets the decoder.
    expect(decoder.decode(undefined as unknown as ArrayBuffer)).toBe("");
  });
});
