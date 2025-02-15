import { DEFAULT_ENCODING, END_OF_STREAM, FINISHED } from "./constant.js";
import { Stream } from "./stream.js";
import type { Encoding } from "./table.js";
import { getEncoding } from "./table.js";
import { stringToCodePoints } from "./utils.js";

export interface Encoder {
  /**
   * @param stream The stream of code points being encoded.
   * @param code_point Next code point read from the stream.
   * @return Byte(s) to emit, or |finished|.
   */
  handler: (stream: Stream, codePoint: number) => number | number[];
}

// Registry of of encoder/decoder factories, by encoding name.
export const encoders: Record<
  string,
  (options: { fatal: boolean }) => Encoder
> = {};

/**
 * @constructor
 *  A TextEncoder object has an associated encoding and encoder.
 * @param label The label of the encoding. NONSTANDARD.
 * @param options NONSTANDARD.
 */
export class TextEncoder {
  _encoding: Encoding;
  _encoder: Encoder | null = null;
  doNotFlush = false;
  _fatal = false;

  constructor(
    label = DEFAULT_ENCODING,
    options: {
      fatal?: boolean;
    } = {},
  ) {
    // Web IDL conventions
    if (!(this instanceof TextEncoder))
      throw TypeError("Called as a function. Did you forget 'new'?");

    // Non-standard
    this.doNotFlush = false;
    if (options.fatal) this._fatal = true;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this._encoding = getEncoding("utf-8")!;

    if (label !== DEFAULT_ENCODING && "console" in global)
      console.warn(
        "TextEncoder constructor called with encoding label, " +
          "which is ignored.",
      );
  }

  get encoding(): string {
    return this._encoding.name.toLowerCase();
  }

  /**
   * @param content The string to encode.
   * @param options
   * @return Encoded bytes, as a Uint8Array.
   */
  encode(content = "", options: { stream?: boolean } = {}): Uint8Array {
    // NOTE: This option is nonstandard. None of the encodings
    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful when
    // the input is a USVString so streaming is not necessary.
    if (!this.doNotFlush)
      this._encoder = encoders[this._encoding.name]({
        fatal: this._fatal,
      });
    this.doNotFlush = Boolean(options.stream);

    // 1. Convert input to a stream.
    const input = new Stream(stringToCodePoints(String(content)));

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result = this._encoder!.handler(input, token);
      if (result === FINISHED) break;
      if (Array.isArray(result)) output.push(...result);
      else output.push(result);
    }
    // TODO: Align with spec algorithm.
    if (!this.doNotFlush) {
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result = this._encoder!.handler(input, input.read());
        if (result === FINISHED) break;
        if (Array.isArray(result)) output.push(...result);
        else output.push(result);
      }
      this._encoder = null;
    }

    // 3. If result is finished, convert output into a byte sequence,
    // and then return a Uint8Array object wrapping an ArrayBuffer
    // containing output.
    return new Uint8Array(output);
  }
}
