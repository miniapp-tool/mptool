import { describe, expect, it } from "vitest";

import { END_OF_STREAM } from "../src/constant.js";
import { Stream } from "../src/stream.js";

// Drain a stream into the order its tokens are read.
const drain = (stream: Stream): number[] => {
  const tokens: number[] = [];

  while (!stream.endOfStream()) tokens.push(stream.read());

  return tokens;
};

describe(Stream, () => {
  it("reads tokens in insertion order and reports end-of-stream", () => {
    const stream = new Stream([1, 2, 3]);

    expect(stream.endOfStream()).toBe(false);
    expect(stream.read()).toBe(1);
    expect(stream.read()).toBe(2);
    expect(stream.read()).toBe(3);
    expect(stream.endOfStream()).toBe(true);

    // Reading an exhausted stream keeps returning end-of-stream instead of throwing.
    expect(stream.read()).toBe(END_OF_STREAM);
    expect(stream.read()).toBe(END_OF_STREAM);
  });

  it("accepts a Uint8Array as its token source", () => {
    const stream = new Stream(new Uint8Array([0x41, 0x42]));

    expect(drain(stream)).toStrictEqual([0x41, 0x42]);
  });

  it("prepends a single token before the remaining tokens", () => {
    const stream = new Stream([1, 2]);

    stream.prepend(0);

    expect(drain(stream)).toStrictEqual([0, 1, 2]);
  });

  it("prepends multiple tokens while keeping their relative order", () => {
    const stream = new Stream([3]);

    stream.prepend([1, 2]);

    expect(drain(stream)).toStrictEqual([1, 2, 3]);
  });

  it("pushes a single token after the remaining tokens", () => {
    const stream = new Stream([1]);

    stream.push(2);

    expect(drain(stream)).toStrictEqual([1, 2]);
  });

  it("pushes multiple tokens while keeping their relative order", () => {
    const stream = new Stream([0]);

    stream.push([1, 2]);

    expect(drain(stream)).toStrictEqual([0, 1, 2]);
  });
});
