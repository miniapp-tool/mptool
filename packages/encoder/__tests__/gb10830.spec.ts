import { describe, expect, it } from "vitest";

import { FINISHED } from "../src/constant.js";
import { TextDecoder, encoders } from "../src/index.js";
import { Stream } from "../src/stream.js";

const decode = (bytes: number[]): string =>
  new TextDecoder("gb18030").decode(new Uint8Array(bytes));

const encode = (content: string): number[] => {
  const encoder = encoders.gb18030({ fatal: false });
  const stream = new Stream(Array.from(content, (char) => char.codePointAt(0)!));
  const bytes: number[] = [];

  let result: number | number[];

  do {
    result = encoder.handler(stream, stream.read());
    if (Array.isArray(result)) bytes.push(...result);
    else if (result !== FINISHED) bytes.push(result);
  } while (result !== FINISHED);

  return bytes;
};

describe(TextDecoder, () => {
  it("gb18030", () => {
    const cases = [
      { bytes: [148, 57, 218, 51], string: "\uD83D\uDCA9" }, // U+1F4A9 PILE OF POO
    ];

    cases.forEach((c) => {
      expect(new TextDecoder("gb18030").decode(new Uint8Array(c.bytes))).toStrictEqual(c.string);
    });
  });

  it("maps 0xA6xx pointers to vertical presentation forms", () => {
    // NOTE: 0xA6DA maps to U+FE12 and 0xA6DB maps to U+FE11, swapped vs. byte order
    const cases = [
      { bytes: [0xa6, 0xd9], char: "\uFE10" },
      { bytes: [0xa6, 0xda], char: "\uFE12" },
      { bytes: [0xa6, 0xdb], char: "\uFE11" },
      { bytes: [0xa6, 0xdc], char: "\uFE13" },
      { bytes: [0xa6, 0xdd], char: "\uFE14" },
      { bytes: [0xa6, 0xde], char: "\uFE15" },
      { bytes: [0xa6, 0xdf], char: "\uFE16" },
      { bytes: [0xa6, 0xec], char: "\uFE17" },
      { bytes: [0xa6, 0xed], char: "\uFE18" },
      { bytes: [0xa6, 0xf3], char: "\uFE19" },
    ];

    cases.forEach(({ bytes, char }) => {
      expect(decode(bytes)).toStrictEqual(char);
      expect(encode(char)).toStrictEqual(bytes);
    });
  });

  it("maps 0xFE5x-0xFEA0 pointers to GB18030-2022 codepoints", () => {
    const cases = [
      { bytes: [0xfe, 0x59], char: "\u9FB4" },
      { bytes: [0xfe, 0x61], char: "\u9FB5" },
      { bytes: [0xfe, 0x66], char: "\u9FB6" },
      { bytes: [0xfe, 0x67], char: "\u9FB7" },
      { bytes: [0xfe, 0x6d], char: "\u9FB8" },
      { bytes: [0xfe, 0x7e], char: "\u9FB9" },
      { bytes: [0xfe, 0x90], char: "\u9FBA" },
      { bytes: [0xfe, 0xa0], char: "\u9FBB" },
    ];

    cases.forEach(({ bytes, char }) => {
      expect(decode(bytes)).toStrictEqual(char);
      expect(encode(char)).toStrictEqual(bytes);
    });
  });
});
