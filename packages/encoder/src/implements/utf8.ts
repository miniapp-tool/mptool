// oxlint-disable max-classes-per-file
// oxlint-disable no-bitwise
import { decoderError } from "./utils.js";
import { END_OF_STREAM, FINISHED } from "../constant.js";
import type { Stream } from "../stream.js";
import type { Decoder } from "../textDecoder.js";
import { decoders } from "../textDecoder.js";
import type { Encoder } from "../textEncoder.js";
import { encoders } from "../textEncoder.js";
import { inRange, isASCIIByte } from "../utils.js";

class UTF8Decoder implements Decoder {
  // utf-8's decoder's has an associated utf-8 code point, utf-8
  // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
  // lower boundary (initially 0x80), and a utf-8 upper boundary
  // (initially 0xBF).
  utf8CodePoint = 0;
  utf8BytesSeen = 0;
  utf8BytesNeeded = 0;
  utf8LowerBoundary = 0x80;
  utf8UpperBoundary = 0xbf;
  fatal = false;

  constructor({ fatal }: { fatal: boolean }) {
    this.fatal = fatal;
  }

  /**
   * @param stream The stream of bytes being decoded.
   * @param bite The next byte read from the stream.
   * @returns The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  // oxlint-disable-next-line max-statements
  handler(stream: Stream, bite: number): number | number[] | null {
    // 1. If byte is end-of-stream and utf-8 bytes needed is not 0,
    // set utf-8 bytes needed to 0 and return error.
    if (bite === END_OF_STREAM && this.utf8BytesNeeded !== 0) {
      this.utf8BytesNeeded = 0;

      return decoderError(this.fatal);
    }

    // 2. If byte is end-of-stream, return finished.
    if (bite === END_OF_STREAM) return FINISHED;

    // 3. If utf-8 bytes needed is 0, based on byte:
    if (this.utf8BytesNeeded === 0) {
      // 0x00 to 0x7F
      if (inRange(bite, 0x00, 0x7f)) {
        // Return a code point whose value is byte.
        return bite;
      }

      // 0xC2 to 0xDF
      else if (inRange(bite, 0xc2, 0xdf)) {
        // 1. Set utf-8 bytes needed to 1.
        this.utf8BytesNeeded = 1;

        // 2. Set UTF-8 code point to byte & 0x1F.
        this.utf8CodePoint = bite & 0x1f;
      }

      // 0xE0 to 0xEF
      else if (inRange(bite, 0xe0, 0xef)) {
        // 1. If byte is 0xE0, set utf-8 lower boundary to 0xA0.
        if (bite === 0xe0) this.utf8LowerBoundary = 0xa0;
        // 2. If byte is 0xED, set utf-8 upper boundary to 0x9F.
        if (bite === 0xed) this.utf8UpperBoundary = 0x9f;
        // 3. Set utf-8 bytes needed to 2.
        this.utf8BytesNeeded = 2;
        // 4. Set UTF-8 code point to byte & 0xF.
        this.utf8CodePoint = bite & 0xf;
      }

      // 0xF0 to 0xF4
      else if (inRange(bite, 0xf0, 0xf4)) {
        // 1. If byte is 0xF0, set utf-8 lower boundary to 0x90.
        if (bite === 0xf0) this.utf8LowerBoundary = 0x90;
        // 2. If byte is 0xF4, set utf-8 upper boundary to 0x8F.
        if (bite === 0xf4) this.utf8UpperBoundary = 0x8f;
        // 3. Set utf-8 bytes needed to 3.
        this.utf8BytesNeeded = 3;
        // 4. Set UTF-8 code point to byte & 0x7.
        this.utf8CodePoint = bite & 0x7;
      }

      // Otherwise
      else {
        // Return error.
        return decoderError(this.fatal);
      }

      // Return continue.
      return null;
    }

    // 4. If byte is not in the range utf-8 lower boundary to utf-8
    // upper boundary, inclusive, run these substeps:
    if (!inRange(bite, this.utf8LowerBoundary, this.utf8UpperBoundary)) {
      // 1. Set utf-8 code point, utf-8 bytes needed, and utf-8
      // bytes seen to 0, set utf-8 lower boundary to 0x80, and set
      // utf-8 upper boundary to 0xBF.
      // oxlint-disable-next-line no-multi-assign
      this.utf8CodePoint = this.utf8BytesNeeded = this.utf8BytesSeen = 0;
      this.utf8LowerBoundary = 0x80;
      this.utf8UpperBoundary = 0xbf;

      // 2. Prepend byte to stream.
      stream.prepend(bite);

      // 3. Return error.
      return decoderError(this.fatal);
    }

    // 5. Set utf-8 lower boundary to 0x80 and utf-8 upper boundary
    // to 0xBF.
    this.utf8LowerBoundary = 0x80;
    this.utf8UpperBoundary = 0xbf;

    // 6. Set UTF-8 code point to (UTF-8 code point << 6) | (byte &
    // 0x3F)
    this.utf8CodePoint = (this.utf8CodePoint << 6) | (bite & 0x3f);

    // 7. Increase utf-8 bytes seen by one.
    this.utf8BytesSeen += 1;

    // 8. If utf-8 bytes seen is not equal to utf-8 bytes needed,
    // continue.
    if (this.utf8BytesSeen !== this.utf8BytesNeeded) return null;

    // 9. Let code point be utf-8 code point.
    const codePoint = this.utf8CodePoint;

    // 10. Set utf-8 code point, utf-8 bytes needed, and utf-8 bytes
    // seen to 0.
    // oxlint-disable-next-line no-multi-assign
    this.utf8CodePoint = this.utf8BytesNeeded = this.utf8BytesSeen = 0;

    // 11. Return a code point whose value is code point.
    return codePoint;
  }
}

class UTF8Encoder implements Encoder {
  fatal = false;

  constructor({ fatal }: { fatal: boolean }) {
    this.fatal = fatal;
  }

  /**
   * @param _stream Input stream.
   * @param codePoint Next code point read from the stream.
   * @returns Byte(s) to emit.
   */
  // oxlint-disable-next-line class-methods-use-this
  handler(_stream: Stream, codePoint: number): number | number[] {
    // 1. If code point is end-of-stream, return finished.
    if (codePoint === END_OF_STREAM) return FINISHED;

    // 2. If code point is an ASCII code point, return a byte whose
    // value is code point.
    if (isASCIIByte(codePoint)) return codePoint;

    // 3. Set count and offset based on the range code point is in:
    let count = 0;
    let offset = 0;

    // U+0080 to U+07FF, inclusive:
    if (inRange(codePoint, 0x0080, 0x07ff)) {
      // 1 and 0xC0
      count = 1;
      offset = 0xc0;
    }
    // U+0800 to U+FFFF, inclusive:
    else if (inRange(codePoint, 0x0800, 0xffff)) {
      // 2 and 0xE0
      count = 2;
      offset = 0xe0;
    }
    // U+10000 to U+10FFFF, inclusive:
    else if (inRange(codePoint, 0x10000, 0x10ffff)) {
      // 3 and 0xF0
      count = 3;
      offset = 0xf0;
    }

    // 4. Let bytes be a byte sequence whose first byte is (code
    // point >> (6 × count)) + offset.
    const bytes = [(codePoint >> (6 * count)) + offset];

    // 5. Run these substeps while count is greater than 0:
    while (count > 0) {
      // 1. Set temp to code point >> (6 × (count − 1)).
      const temp = codePoint >> (6 * (count - 1));

      // 2. Append to bytes 0x80 | (temp & 0x3F).
      bytes.push(0x80 | (temp & 0x3f));

      // 3. Decrease count by one.
      count -= 1;
    }

    // 6. Return bytes bytes, in order.
    return bytes;
  }
}

encoders["UTF-8"] = (options: { fatal: boolean }): Encoder => new UTF8Encoder(options);

decoders["UTF-8"] = (options: { fatal: boolean }): Decoder => new UTF8Decoder(options);
