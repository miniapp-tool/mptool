import { DEFAULT_ENCODING, END_OF_STREAM, FINISHED } from "./constant.js";
import { Stream } from "./stream.js";
import { Encoding, getEncoding } from "./table.js";
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
  doNotFlush: boolean = false;
  _fatal: boolean = false;

  constructor(
    label = DEFAULT_ENCODING,
    options: { fatal?: boolean; NONSTANDARD_allowLegacyEncoding?: boolean } = {}
  ) {
    // Web IDL conventions
    if (!(this instanceof TextEncoder))
      throw TypeError("Called as a function. Did you forget 'new'?");

    // Non-standard
    this.doNotFlush = false;
    if (options.fatal) this._fatal = true;

    // 2. Set enc's encoding to UTF-8's encoder.
    if (options["NONSTANDARD_allowLegacyEncoding"]) {
      // NONSTANDARD behavior.
      label = label !== undefined ? String(label) : DEFAULT_ENCODING;
      const encoding = getEncoding(label);
      if (encoding === null || encoding.name === "replacement")
        throw RangeError("Unknown encoding: " + label);
      if (!encoders[encoding.name]) {
        throw Error(
          "Encoder not present." +
            " Did you forget to include encoding-indexes.js first?"
        );
      }
      this._encoding = encoding;
    } else {
      // Standard behavior.
      this._encoding = getEncoding("utf-8")!;

      if (label !== undefined && "console" in global) {
        console.warn(
          "TextEncoder constructor called with encoding label, " +
            "which is ignored."
        );
      }
    }
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
    content = content === undefined ? "" : String(content);

    // NOTE: This option is nonstandard. None of the encodings
    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful when
    // the input is a USVString so streaming is not necessary.
    if (!this.doNotFlush)
      this._encoder = encoders[this._encoding.name]({
        fatal: this._fatal,
      });
    this.doNotFlush = Boolean(options.stream);

    // 1. Convert input to a stream.
    const input = new Stream(stringToCodePoints(content));

    // 2. Let output be a new stream
    const output = [];

    let result: number | number[] | null;

    // 3. While true, run these substeps:
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // 1. Let token be the result of reading from input.
      const token = input.read();
      if (token === END_OF_STREAM) break;
      // 2. Let result be the result of processing token for encoder,
      // input, output.
      result = this._encoder!.handler(input, token);
      if (result === FINISHED) break;
      if (Array.isArray(result)) output.push(...result);
      else output.push(result);
    }
    // TODO: Align with spec algorithm.
    if (!this.doNotFlush) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
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
