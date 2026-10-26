import { describe, expect, it } from "vitest";

import { FINISHED } from "../src/constant.js";
import type { Decoder } from "../src/textDecoder.js";
import { TextDecoder, decoders } from "../src/textDecoder.js";
import type { Encoder } from "../src/textEncoder.js";
import { TextEncoder, encoders } from "../src/textEncoder.js";

// These tests intentionally import the codec factories directly, without the side-effect module that
// registers the built-in codecs. The registries are module-level objects there and are not frozen
// yet, so the defensive "no codec registered" guards and the loop fallbacks can be exercised with a
// tiny stand-in codec. The public entry point always registers every table encoding and freezes both
// registries, which is why those branches cannot be reached through `new TextDecoder()` /
// `new TextEncoder()` from `src/index.ts`.
const withDecoder = (handler: Decoder["handler"], run: () => void): void => {
  decoders.GBK = (): Decoder => ({ handler });
  try {
    run();
  } finally {
    delete decoders.GBK;
  }
};

const withEncoder = (handler: Encoder["handler"], run: () => void): void => {
  encoders.GBK = (): Encoder => ({ handler });
  try {
    run();
  } finally {
    delete encoders.GBK;
  }
};

describe("textDecoder registry guard", () => {
  it("throws when the selected encoding has no registered decoder", () => {
    expect(() => new TextDecoder("gbk")).toThrow("Decoder not present.");
  });
});

describe("textDecoder loop fallbacks", () => {
  it("stops the main loop when a decoder reports FINISHED early", () => {
    withDecoder(
      () => FINISHED,
      () => {
        expect(new TextDecoder("gbk").decode(Uint8Array.of(0x41))).toBe("");
      },
    );
  });

  it("accepts array results from a decoder in both loops", () => {
    withDecoder(
      () => [0x41, 0x42],
      () => {
        expect(new TextDecoder("gbk").decode(Uint8Array.of(0x41))).toBe("ABAB");
      },
    );
  });

  it("continues the flush loop when a decoder returns null", () => {
    withDecoder(
      () => null,
      () => {
        expect(new TextDecoder("gbk").decode(Uint8Array.of(0x41))).toBe("");
      },
    );
  });
});

describe("textEncoder registry guard", () => {
  it("throws when the selected encoding has no registered encoder", () => {
    expect(() => new TextEncoder("gbk")).toThrow("Encoder not present.");
  });
});

describe("textEncoder loop fallbacks", () => {
  it("stops the main loop when an encoder reports FINISHED early", () => {
    withEncoder(
      () => FINISHED,
      () => {
        expect([...new TextEncoder("gbk").encode("A")]).toStrictEqual([]);
      },
    );
  });

  it("emits array and single-byte results before the encoder finishes flushing", () => {
    const results: (number | number[])[] = [0x41, [0x42], 0x43, FINISHED];
    let call = -1;

    withEncoder(
      () => {
        call += 1;
        return results[call];
      },
      () => {
        expect([...new TextEncoder("gbk").encode("A")]).toStrictEqual([0x41, 0x42, 0x43]);
      },
    );
  });
});
