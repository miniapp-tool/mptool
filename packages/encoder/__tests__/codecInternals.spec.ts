import { describe, expect, it } from "vitest";

import { END_OF_STREAM } from "../src/constant.js";
import { TextDecoder } from "../src/index.js";
import { encodingIndex } from "../src/indexes.js";
import { Stream } from "../src/stream.js";
import { decoders } from "../src/textDecoder.js";
import { encoders } from "../src/textEncoder.js";

const GB18030_INDEX_LENGTH = 23_940;

const withGB18030Index = (value: Uint16Array | undefined, run: () => void): void => {
  const descriptor = Object.getOwnPropertyDescriptor(encodingIndex, "gb18030")!;

  try {
    Object.defineProperty(encodingIndex, "gb18030", { configurable: true, value });
    run();
  } finally {
    Object.defineProperty(encodingIndex, "gb18030", descriptor);
  }
};

interface GB18030DecoderState {
  gb18030First: number;
  gb18030Second: number;
  gb18030Third: number;
  handler: (stream: Stream, bite: number) => number | number[] | null;
}

const createGb18030Decoder = decoders.GBK;

const createDecoder = (): GB18030DecoderState =>
  createGb18030Decoder({ fatal: false }) as GB18030DecoderState;

describe("gb18030 decoder index guards", () => {
  it("returns null when the index is unavailable", () => {
    withGB18030Index(undefined, () => {
      // The pointer 0 is valid, but the decoder has no index to map it.
      expect(new TextDecoder("gbk").decode(Uint8Array.from([0x81, 0x40]))).toBe("\uFFFD@");
    });
  });

  it("returns null for a zero entry in the index", () => {
    withGB18030Index(new Uint16Array(GB18030_INDEX_LENGTH), () => {
      // The gb18030 index has no zeros in practice; the `|| null` fallback is defensive.
      expect(new TextDecoder("gbk").decode(Uint8Array.from([0x81, 0x40]))).toBe("\uFFFD@");
    });
  });
});

describe("gb18030 decoder end-of-stream state", () => {
  it("clears a pending second byte", () => {
    const decoder = createDecoder();

    decoder.gb18030Second = 0x30;

    expect(decoder.handler(new Stream([]), END_OF_STREAM)).toBe(0xfffd);
    expect(decoder.gb18030First).toBe(0);
    expect(decoder.gb18030Second).toBe(0);
    expect(decoder.gb18030Third).toBe(0);
  });

  it("clears a pending third byte", () => {
    const decoder = createDecoder();

    decoder.gb18030Third = 0x81;

    expect(decoder.handler(new Stream([]), END_OF_STREAM)).toBe(0xfffd);
    expect(decoder.gb18030First).toBe(0);
    expect(decoder.gb18030Second).toBe(0);
    expect(decoder.gb18030Third).toBe(0);
  });
});

describe("utf-8 encoder invalid scalar guard", () => {
  it("falls through for a code point above U+10FFFF", () => {
    const createUtf8Encoder = encoders["UTF-8"];
    const encoder = createUtf8Encoder({ fatal: false });

    expect(encoder.handler(new Stream([]), 0x110000)).toStrictEqual([0x110000]);
  });
});
