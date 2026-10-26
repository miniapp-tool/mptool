import { describe, expect, it } from "vitest";

import { decoderError, encoderError } from "../src/implements/utils.js";
import { codePointsToString, stringToCodePoints } from "../src/utils.js";

describe(stringToCodePoints, () => {
  it("returns the code unit of every BMP character", () => {
    expect(stringToCodePoints("A中")).toStrictEqual([0x41, 0x4e2d]);
  });

  it("combines a surrogate pair into one code point", () => {
    expect(stringToCodePoints("💩")).toStrictEqual([0x1f4a9]);
  });

  it("replaces a lone low surrogate", () => {
    expect(stringToCodePoints("\uDC00")).toStrictEqual([0xfffd]);
  });

  it("replaces a trailing high surrogate", () => {
    expect(stringToCodePoints("\uD800")).toStrictEqual([0xfffd]);
    expect(stringToCodePoints("A\uD800")).toStrictEqual([0x41, 0xfffd]);
  });

  it("replaces a high surrogate that is not followed by a low surrogate", () => {
    expect(stringToCodePoints("\uD800A")).toStrictEqual([0xfffd, 0x41]);
    expect(stringToCodePoints("\uD800\uD800")).toStrictEqual([0xfffd, 0xfffd]);
  });
});

describe(codePointsToString, () => {
  it("serializes BMP code points", () => {
    expect(codePointsToString([0x41, 0x4e2d])).toBe("A中");
  });

  it("serializes supplementary code points as a surrogate pair", () => {
    expect(codePointsToString([0x1f4a9])).toBe("💩");
    expect(codePointsToString([0x10ffff])).toBe("\uDBFF\uDFFF");
  });

  it("round-trips through stringToCodePoints", () => {
    const sample = "A中💩\uFEFF";

    expect(codePointsToString(stringToCodePoints(sample))).toBe(sample);
  });

  it("returns an empty string for an empty list", () => {
    expect(codePointsToString([])).toBe("");
  });
});

describe(decoderError, () => {
  it("returns U+FFFD by default", () => {
    expect(decoderError(false)).toBe(0xfffd);
  });

  it("returns the override code point when one is given", () => {
    expect(decoderError(false, 0x41)).toBe(0x41);
  });

  it("throws in fatal mode", () => {
    expect(() => decoderError(true)).toThrow(TypeError);
    expect(() => decoderError(true, 0x41)).toThrow(TypeError);
  });
});

describe(encoderError, () => {
  it("throws a TypeError naming the code point", () => {
    expect(() => encoderError(0xe5e5)).toThrow(TypeError);
    expect(() => encoderError(0xe5e5)).toThrow("58853");
  });
});
