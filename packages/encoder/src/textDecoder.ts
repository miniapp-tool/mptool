import { DEFAULT_ENCODING, END_OF_STREAM, FINISHED } from "./constant.js";
import { Stream } from "./stream.js";
import type { Encoding } from "./table.js";
import { getEncoding } from "./table.js";
import { codePointsToString } from "./utils.js";

export interface Decoder {
  /**
   * @param stream The stream of bytes being decoded.
   * @param bite The next byte read from the stream.
   * @return The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point, or |finished|.
   */
  handler: (stream: Stream, bite: number) => number | number[] | null;
}

export const decoders: Record<
  string,
  (options: { fatal: boolean }) => Decoder
> = {};

/**
 * @constructor
 * A TextDecoder object has an associated encoding, decoder,
 * stream, ignore BOM flag (initially unset), BOM seen flag
 * (initially unset), error mode (initially replacement), and do
 * not flush flag (initially unset).
 * @param label The label of the encoding;
 *     defaults to 'utf-8'.
 * @param options
 */
export class TextDecoder {
  _encoding: Encoding;
  _ignoreBOM: boolean = false;
  _decoder: Decoder | null = null;
  _BOMseen: boolean = false;
  _fatal: boolean = false;
  doNotFlush: boolean = false;

  constructor(
    label = DEFAULT_ENCODING,
    options: { fatal?: boolean; ignoreBOM?: boolean } = {},
  ) {
    // 1. Let encoding be the result of getting an encoding from
    // label.
    const encoding = getEncoding(label);

    // 2. If encoding is failure or replacement, throw a RangeError.
    if (encoding === null || encoding.name === "replacement")
      throw RangeError("Unknown encoding: " + label);
    if (!decoders[encoding.name]) throw Error("Decoder not present.");

    // 4. Set encoding.
    this._encoding = encoding;

    // 5. If options's fatal member is true, set dec's error mode to
    // fatal.
    if (options.fatal) this._fatal = true;

    // 6. If options's ignoreBOM member is true, set dec's ignore BOM
    // flag.
    if (options.ignoreBOM) this._ignoreBOM = true;
  }

  // The encoding attribute's getter must return encoding's name.
  get encoding(): string {
    return this._encoding.name.toLowerCase();
  }

  // The fatal attribute's getter must return true if error mode
  // is fatal, and false otherwise.
  get fatal(): boolean {
    return this._fatal;
  }

  // The ignoreBOM attribute's getter must return true if ignore
  // BOM flag is set, and false otherwise.
  get ignoreBOM(): boolean {
    return this._ignoreBOM;
  }

  /**
   * @param input The buffer of bytes to decode.
   * @param options
   * @return The decoded string.
   */
  decode(
    input: ArrayBuffer | ArrayBufferView,
    options: { stream?: boolean } = {},
  ): string {
    let bytes;

    if (typeof input === "object" && input instanceof ArrayBuffer)
      bytes = new Uint8Array(input);
    else if (
      typeof input === "object" &&
      "buffer" in input &&
      input.buffer instanceof ArrayBuffer
    )
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    else bytes = new Uint8Array(0);

    // 1. If the do not flush flag is unset, set decoder to a new
    // encoding's decoder, set stream to a new stream, and unset the
    // BOM seen flag.
    if (!this.doNotFlush) {
      this._decoder = decoders[this._encoding.name]({
        fatal: this._fatal,
      });
      this._BOMseen = false;
    }

    // 2. If options's stream is true, set the do not flush flag, and
    // unset the do not flush flag otherwise.
    this.doNotFlush = Boolean(options.stream);

    // 3. If input is given, push a copy of input to stream.
    // TODO: Align with spec algorithm - maintain stream on instance.
    const inputStream = new Stream(bytes);

    // 4. Let output be a new stream.
    const output = [];

    let result: number | number[] | null;

    // 5. While true:
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // 1. Let token be the result of reading from stream.
      const token = inputStream.read();

      // 2. If token is end-of-stream and the do not flush flag is
      // set, return output, serialized.
      // TODO: Align with spec algorithm.
      if (token === END_OF_STREAM) break;

      // 3. Otherwise, run these subsubsteps:

      // 1. Let result be the result of processing token for decoder,
      // stream, output, and error mode.
      result = this._decoder!.handler(inputStream, token);

      // 2. If result is finished, return output, serialized.
      if (result === FINISHED) break;

      if (result !== null)
        if (Array.isArray(result)) output.push(...result);
        else output.push(result);

      // 3. Otherwise, if result is error, throw a TypeError.
      // (Thrown in handler)

      // 4. Otherwise, do nothing.
    }
    // TODO: Align with spec algorithm.
    if (!this.doNotFlush) {
      do {
        result = this._decoder!.handler(inputStream, inputStream.read());

        if (result === FINISHED) break;
        if (result === null) continue;
        if (Array.isArray(result)) output.push(...result);
        else output.push(result);
      } while (!inputStream.endOfStream());
      this._decoder = null;
    }

    return this.serializeStream(output);
  }

  // A TextDecoder object also has an associated serialize stream
  // algorithm...
  /**
   * @param stream
   */
  private serializeStream(stream: number[]): string {
    // 1. Let token be the result of reading from stream.
    // (Done in-place on array, rather than as a stream)

    // 2. If encoding is UTF-8, UTF-16BE, or UTF-16LE, and ignore
    // BOM flag and BOM seen flag are unset, run these subsubsteps:
    if (
      ["UTF-8", "UTF-16LE", "UTF-16BE"].includes(this._encoding.name) &&
      !this._ignoreBOM &&
      !this._BOMseen
    )
      if (stream.length > 0 && stream[0] === 0xfeff) {
        // 1. If token is U+FEFF, set BOM seen flag.
        this._BOMseen = true;
        stream.shift();
      } else if (stream.length > 0) {
        // 2. Otherwise, if token is not end-of-stream, set BOM seen
        // flag and append token to stream.
        this._BOMseen = true;
      } else {
        // 3. Otherwise, if token is not end-of-stream, append token
        // to output.
        // (no-op)
      }

    // 4. Otherwise, return output.
    return codePointsToString(stream);
  }
}
