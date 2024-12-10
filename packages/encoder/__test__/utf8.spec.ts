import { expect, it } from "vitest";

import { TextDecoder, TextEncoder } from "../src/index.js";

const encodeUtf8 = (content: string): Uint8Array => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const utf8 = unescape(encodeURIComponent(content));
  const octets = new Uint8Array(utf8.length);

  for (let i = 0; i < utf8.length; i += 1) octets[i] = utf8.charCodeAt(i);

  return octets;
};

const decodeUtf8 = (octets: Uint8Array): string => {
  const utf8 = String.fromCharCode(...octets);

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return decodeURIComponent(escape(utf8));
};

const generateBlock = (from: number, len: number, skip: number): string => {
  const block: string[] = [];

  for (let i = 0; i < len; i += skip) {
    let cp = from + i;

    if (0xd800 <= cp && cp <= 0xdfff) continue;
    if (cp < 0x10000) {
      block.push(String.fromCharCode(cp));
      continue;
    }
    cp = cp - 0x10000;
    block.push(String.fromCharCode(0xd800 + (cp >> 10)));
    block.push(String.fromCharCode(0xdc00 + (cp & 0x3ff)));
  }

  return block.join("");
};

it("UTF-8 - Encode/Decode - reference sample", () => {
  // z, cent, CJK water, G-Clef, Private-use character
  const sample = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD";
  const cases = [
    {
      encoding: "utf-8",
      expected: [
        0x7a, 0xc2, 0xa2, 0xe6, 0xb0, 0xb4, 0xf0, 0x9d, 0x84, 0x9e, 0xf4, 0x8f,
        0xbf, 0xbd,
      ],
    },
  ];

  cases.forEach((t) => {
    const decoded = new TextDecoder(t.encoding).decode(
      new Uint8Array(t.expected),
    );

    expect(decoded).toEqual(sample);
  });
});

it("UTF-8 - Encode/Decode - full roundtrip and agreement with encode/decodeURIComponent", () => {
  const MIN_CODEPOINT = 0;
  const MAX_CODEPOINT = 0x10ffff;
  const BLOCK_SIZE = 0x1000;
  const SKIP_SIZE = 31;

  const TE_U8 = new TextEncoder();
  const TD_U8 = new TextDecoder("UTF-8");

  for (let index = MIN_CODEPOINT; index < MAX_CODEPOINT; index += BLOCK_SIZE) {
    const block = generateBlock(index, BLOCK_SIZE, SKIP_SIZE);

    const encoded = TE_U8.encode(block);
    const decoded = TD_U8.decode(encoded);

    expect(block).toEqual(decoded);

    // test TextEncoder(UTF-8) against the older idiom
    const expWncoded = encodeUtf8(block);

    expect(encoded).toEqual(expWncoded);

    const expDecoded = decodeUtf8(expWncoded);

    expect(decoded).toEqual(expDecoded);
  }
});
