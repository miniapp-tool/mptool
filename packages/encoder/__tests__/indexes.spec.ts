import { describe, expect, it } from "vitest";

import { decodeBase64, encodingIndex } from "../src/indexes.js";

const bytes = (value: Uint8Array): number[] => [...value];

describe(decodeBase64, () => {
  it("decodes payloads without padding", () => {
    expect(bytes(decodeBase64("Zm9v"))).toStrictEqual([0x66, 0x6f, 0x6f]);
    expect(bytes(decodeBase64("+/8="))).toStrictEqual([0xfb, 0xff]);
  });

  it("decodes payloads with one or two padding characters exactly", () => {
    // "Zg==" -> "f", "Zm8=" -> "fo": the output must not keep the zero-filled tail that the old
    // `(input.length * 3) >> 2` capacity left behind.
    expect(bytes(decodeBase64("Zg=="))).toStrictEqual([0x66]);
    expect(bytes(decodeBase64("Zm8="))).toStrictEqual([0x66, 0x6f]);
  });

  it("stops at the first padding character", () => {
    expect(decodeBase64("Zg==")).toHaveLength(1);
    expect(decodeBase64("Zm8=")).toHaveLength(2);
  });
});

describe("gb18030 index", () => {
  it("builds the gb18030 index lazily", () => {
    // The index is decoded on first access instead of at module load (`E3` in the review).
    expect(Object.getOwnPropertyDescriptor(encodingIndex, "gb18030")?.get).toBeTypeOf("function");
  });

  it("decodes the gb18030 index with the expected shape", () => {
    const index = encodingIndex.gb18030;

    expect(index).toBeInstanceOf(Uint16Array);
    expect(index).toHaveLength(23_940);
    expect(index[0]).toBe(0x4e02);
    expect(Math.min(...index)).toBeGreaterThanOrEqual(164);
    expect(Math.max(...index)).toBeLessThanOrEqual(65509);
    expect(encodingIndex["gb18030-ranges"].length).toBeGreaterThan(0);
  });
});
