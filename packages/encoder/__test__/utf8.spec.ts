import { expect, it } from "vitest";
import { TextDecoder, TextEncoder } from "../src/index.js";

// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

// Extension to testharness.js API which avoids logging enormous strings
// on a coding failure.
function assert_string_equals(actual, expected, description) {
  // short circuit success case
  if (actual === expected) {
    expect(actual).toEqual(expected);

    return;
  }

  // length check
  expect(actual.length).toEqual(expected.length);

  for (let i = 0; i < actual.length; i++) {
    const a = actual.charCodeAt(i);
    const b = expected.charCodeAt(i);
    if (a !== b)
      assert_true(
        false,
        description +
          ": code unit " +
          i.toString() +
          " unequal: " +
          cpname(a) +
          " != " +
          cpname(b)
      ); // doesn't return
  }

  // It should be impossible to get here, because the initial
  // comparison failed, so either the length comparison or the
  // codeunit-by-codeunit comparison should also fail.
  console.error("fail");
}

// Inspired by:
// http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
function encode_utf8(string) {
  const utf8 = unescape(encodeURIComponent(string));
  let octets = new Uint8Array(utf8.length),
    i;
  for (i = 0; i < utf8.length; i += 1) {
    octets[i] = utf8.charCodeAt(i);
  }
  return octets;
}

function decode_utf8(octets) {
  const utf8 = String.fromCharCode.apply(null, octets);
  return decodeURIComponent(escape(utf8));
}

// Helpers for test_utf_roundtrip.
function cpname(n) {
  if (n + 0 !== n) return n.toString();
  const w = n <= 0xffff ? 4 : 6;
  return "U+" + ("000000" + n.toString(16).toUpperCase()).slice(-w);
}

function genblock(from, len, skip) {
  const block = [];
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
}

function test_utf_roundtrip() {
  const MIN_CODEPOINT = 0;
  const MAX_CODEPOINT = 0x10ffff;
  const BLOCK_SIZE = 0x1000;
  const SKIP_SIZE = 31;

  const TE_U8 = new TextEncoder();
  const TD_U8 = new TextDecoder("UTF-8");

  for (let i = MIN_CODEPOINT; i < MAX_CODEPOINT; i += BLOCK_SIZE) {
    const block_tag = cpname(i) + " - " + cpname(i + BLOCK_SIZE - 1);
    const block = genblock(i, BLOCK_SIZE, SKIP_SIZE);

    const encoded = TE_U8.encode(block);
    const decoded = TD_U8.decode(encoded);
    assert_string_equals(block, decoded, "UTF-8 round trip " + block_tag);

    // test TextEncoder(UTF-8) against the older idiom
    const expWncoded = encode_utf8(block);

    expect(encoded).toEqual(expWncoded);

    const expDecoded = decode_utf8(expWncoded);

    assert_string_equals(
      decoded,
      expDecoded,
      "UTF-8 reference decoding " + block_tag
    );
  }
}

function test_utf_samples() {
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
      new Uint8Array(t.expected)
    );
    expect(decoded).toEqual(sample);
  });
}

it("UTF-8 - Encode/Decode - reference sample", () => {
  test_utf_samples();
});

it(
  "UTF-8 - Encode/Decode - full roundtrip and " +
    "agreement with encode/decodeURIComponent",
  () => {
    test_utf_roundtrip();
  }
);
