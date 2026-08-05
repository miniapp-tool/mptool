import { describe, expect, it } from "vitest";

import { TextDecoder } from "../src/index.js";

describe(TextDecoder, () => {
  it("gb18030", () => {
    const cases = [
      { bytes: [148, 57, 218, 51], string: "\uD83D\uDCA9" }, // U+1F4A9 PILE OF POO
    ];

    cases.forEach((c) => {
      expect(new TextDecoder("gb18030").decode(new Uint8Array(c.bytes))).toStrictEqual(c.string);
    });
  });
});
