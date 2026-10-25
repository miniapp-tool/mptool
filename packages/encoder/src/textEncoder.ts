import { DEFAULT_ENCODING, END_OF_STREAM, FINISHED } from "./constant.js";
import { Stream } from "./stream.js";
import type { Encoding } from "./table.js";
import { getEncoding } from "./table.js";
import { stringToCodePoints } from "./utils.js";

export interface Encoder {
  /**
   * @param stream The stream of code points being encoded.
   * @param codePoint Next code point read from the stream.
   * @returns Byte(s) to emit, or |finished|.
   */
  handler: (stream: Stream, codePoint: number) => number | number[];
}

// Registry of of encoder/decoder factories, by encoding name.
export const encoders: Record<string, (options: { fatal: boolean }) => Encoder> = {};

/**
 * A TextEncoder object has an associated encoding and encoder.
 *
 * Unlike the WHATWG `TextEncoder` (which always encodes UTF-8), this polyfill accepts a
 * non-standard encoding label so callers can encode legacy encodings, e.g. `new
 * TextEncoder("gbk").encode("中文")`.
 *
 * @param label The label of the encoding. NONSTANDARD.
 * @param options NONSTANDARD.
 */
export class TextEncoder {
  readonly #encoding: Encoding;
  #encoder: Encoder | null = null;
  #doNotFlush = false;
  readonly #fatal: boolean = false;

  constructor(
    label: string = DEFAULT_ENCODING,
    options: {
      fatal?: boolean;
    } = {},
  ) {
    // Non-standard
    if (options.fatal) this.#fatal = true;

    // 1. Let encoding be the result of getting an encoding from label.
    const encoding = getEncoding(label);

    // 2. If encoding is failure or replacement, throw a RangeError.
    if (encoding == null || encoding.name === "replacement")
      throw new RangeError(`Unknown encoding: ${label}`);
    if (!(encoding.name in encoders)) throw new Error("Encoder not present.");

    this.#encoding = encoding;
  }

  get encoding(): string {
    return this.#encoding.name.toLowerCase();
  }

  /**
   * @param content The string to encode.
   * @param options Encoding options
   * @returns Encoded bytes, as a Uint8Array.
   */
  encode(content = "", options: { stream?: boolean } = {}): Uint8Array {
    // NOTE: This option is nonstandard. None of the encodings
    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful when
    // the input is a USVString so streaming is not necessary.
    if (!this.#doNotFlush) {
      this.#encoder = encoders[this.#encoding.name]({
        fatal: this.#fatal,
      });
    }
    this.#doNotFlush = Boolean(options.stream);

    // 1. Convert input to a stream.
    const input = new Stream(stringToCodePoints(content));

    // 2. Let output be a new stream
    const output = [];

    let result: number | number[] | null;

    // 3. While true, run these substeps:

    while (true) {
      // 1. Let token be the result of reading from input.
      const token = input.read();

      if (token === END_OF_STREAM) break;
      // 2. Let result be the result of processing token for encoder,
      // input, output.
      // oxlint-disable-next-line typescript/no-non-null-assertion
      result = this.#encoder!.handler(input, token);
      if (result === FINISHED) break;
      if (Array.isArray(result)) output.push(...result);
      else output.push(result);
    }
    // TODO: Align with spec algorithm.
    if (!this.#doNotFlush) {
      while (true) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        result = this.#encoder!.handler(input, input.read());
        if (result === FINISHED) break;
        if (Array.isArray(result)) output.push(...result);
        else output.push(result);
      }
      this.#encoder = null;
    }

    // 3. If result is finished, convert output into a byte sequence,
    // and then return a Uint8Array object wrapping an ArrayBuffer
    // containing output.
    return new Uint8Array(output);
  }
}
