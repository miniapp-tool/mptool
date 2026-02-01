// oxlint-disable max-classes-per-file
import { decoderError, encoderError } from "./utils.js";
import { END_OF_STREAM, FINISHED } from "../constant.js";
import { encodingIndex } from "../indexes.js";
import type { Stream } from "../stream.js";
import type { Decoder } from "../textDecoder.js";
import { decoders } from "../textDecoder.js";
import type { Encoder } from "../textEncoder.js";
import { encoders } from "../textEncoder.js";
import { inRange, isASCIIByte } from "../utils.js";

/**
 * @param pointer The |pointer| to search for.
 * @param index The |index| to search within.
 * @returns The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in |index|.
 */
const indexCodePointFor = (pointer: number, index: number[] | undefined): number | null => {
  if (!index) return null;

  return index[pointer] || null;
};

/**
 * @param codePoint The |code point| to search for.
 * @param index The |index| to search within.
 * @returns The first pointer corresponding to |code point| in
 *     |index|, or null if |code point| is not in |index|.
 */
const indexPointerFor = (codePoint: number, index: number[]): number | null => {
  const pointer = index.indexOf(codePoint);

  return pointer === -1 ? null : pointer;
};

/**
 * @param pointer The |pointer| to search for in the gb18030 index.
 * @returns The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in the gb18030 index.
 */
const indexGB18030RangesCodePointFor = (pointer: number): number | null => {
  // 1. If pointer is greater than 39419 and less than 189000, or
  // pointer is greater than 1237575, return null.
  if ((pointer > 39419 && pointer < 189000) || pointer > 1237575) return null;

  // 2. If pointer is 7457, return code point U+E7C7.
  if (pointer === 7457) return 0xe7c7;

  // 3. Let offset be the last pointer in index gb18030 ranges that
  // is equal to or less than pointer and let code point offset be
  // its corresponding code point.
  let offset = 0;
  let codePointOffset = 0;
  const idx = encodingIndex["gb18030-ranges"];
  let i;

  for (i = 0; i < idx.length; ++i) {
    /** @type {!Array.<number>} */
    const entry = idx[i];

    if (entry[0] <= pointer) {
      offset = entry[0];
      codePointOffset = entry[1];
    } else {
      break;
    }
  }

  // 4. Return a code point whose value is code point offset +
  // pointer − offset.
  return codePointOffset + pointer - offset;
};

/**
 * @param codePoint The |code point| to locate in the gb18030 index.
 * @returns The first pointer corresponding to |code point| in the
 *     gb18030 index.
 */
const indexGB18030RangesPointerFor = (codePoint: number): number => {
  // 1. If code point is U+E7C7, return pointer 7457.
  if (codePoint === 0xe7c7) return 7457;

  // 2. Let offset be the last code point in index gb18030 ranges
  // that is equal to or less than code point and let pointer offset
  // be its corresponding pointer.
  let offset = 0;
  let pointerOffset = 0;
  const idx = encodingIndex["gb18030-ranges"];
  let i;

  for (i = 0; i < idx.length; ++i) {
    /** @type {!Array.<number>} */
    const entry = idx[i];

    if (entry[1] <= codePoint) {
      offset = entry[1];
      pointerOffset = entry[0];
    } else {
      break;
    }
  }

  // 3. Return a pointer whose value is pointer offset + code point
  // − offset.
  return pointerOffset + codePoint - offset;
};

class GB18030Decoder implements Decoder {
  // gb18030's decoder has an associated gb18030 first, gb18030
  // second, and gb18030 third (all initially 0x00).
  gb18030First = 0x00;
  gb18030Second = 0x00;
  gb18030Third = 0x00;
  fatal = false;

  constructor(options: { fatal: boolean }) {
    this.fatal = options.fatal;
  }

  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @returns {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  // oxlint-disable-next-line complexity, max-statements
  handler(stream: Stream, bite: number): number | number[] | null {
    // 1. If byte is end-of-stream and gb18030 first, gb18030
    // second, and gb18030 third are 0x00, return finished.
    if (
      bite === END_OF_STREAM &&
      this.gb18030First === 0x00 &&
      this.gb18030Second === 0x00 &&
      this.gb18030Third === 0x00
    )
      return FINISHED;

    // 2. If byte is end-of-stream, and gb18030 first, gb18030
    // second, or gb18030 third is not 0x00, set gb18030 first,
    // gb18030 second, and gb18030 third to 0x00, and return error.
    if (
      bite === END_OF_STREAM &&
      (this.gb18030First !== 0x00 || this.gb18030Second !== 0x00 || this.gb18030Third !== 0x00)
    ) {
      this.gb18030First = 0x00;
      this.gb18030Second = 0x00;
      this.gb18030Third = 0x00;
      decoderError(this.fatal);
    }
    let codePoint;

    // 3. If gb18030 third is not 0x00, run these substeps:
    if (this.gb18030Third !== 0x00) {
      // 1. Let code point be null.
      codePoint = null;
      // 2. If byte is in the range 0x30 to 0x39, inclusive, set
      // code point to the index gb18030 ranges code point for
      // (((gb18030 first − 0x81) × 10 + gb18030 second − 0x30) ×
      // 126 + gb18030 third − 0x81) × 10 + byte − 0x30.
      if (inRange(bite, 0x30, 0x39))
        codePoint = indexGB18030RangesCodePointFor(
          (((this.gb18030First - 0x81) * 10 + this.gb18030Second - 0x30) * 126 +
            this.gb18030Third -
            0x81) *
            10 +
            bite -
            0x30,
        );

      // 3. Let buffer be a byte sequence consisting of gb18030
      // second, gb18030 third, and byte, in order.
      const buffer = [this.gb18030Second, this.gb18030Third, bite];

      // 4. Set gb18030 first, gb18030 second, and gb18030 third to
      // 0x00.
      this.gb18030First = 0x00;
      this.gb18030Second = 0x00;
      this.gb18030Third = 0x00;

      // 5. If code point is null, prepend buffer to stream and
      // return error.
      if (codePoint === null) {
        stream.prepend(buffer);

        return decoderError(this.fatal);
      }

      // 6. Return a code point whose value is code point.
      return codePoint;
    }

    // 4. If gb18030 second is not 0x00, run these substeps:
    if (this.gb18030Second !== 0x00) {
      // 1. If byte is in the range 0x81 to 0xFE, inclusive, set
      // gb18030 third to byte and return continue.
      if (inRange(bite, 0x81, 0xfe)) {
        this.gb18030Third = bite;

        return null;
      }

      // 2. Prepend gb18030 second followed by byte to stream, set
      // gb18030 first and gb18030 second to 0x00, and return error.
      stream.prepend([this.gb18030Second, bite]);
      this.gb18030First = 0x00;
      this.gb18030Second = 0x00;

      return decoderError(this.fatal);
    }

    // 5. If gb18030 first is not 0x00, run these substeps:
    if (this.gb18030First !== 0x00) {
      // 1. If byte is in the range 0x30 to 0x39, inclusive, set
      // gb18030 second to byte and return continue.
      if (inRange(bite, 0x30, 0x39)) {
        this.gb18030Second = bite;

        return null;
      }

      // 2. Let lead be gb18030 first, let pointer be null, and set
      // gb18030 first to 0x00.
      const lead = this.gb18030First;
      let pointer = null;

      this.gb18030First = 0x00;

      // 3. Let offset be 0x40 if byte is less than 0x7F and 0x41
      // otherwise.
      const offset = bite < 0x7f ? 0x40 : 0x41;

      // 4. If byte is in the range 0x40 to 0x7E, inclusive, or 0x80
      // to 0xFE, inclusive, set pointer to (lead − 0x81) × 190 +
      // (byte − offset).
      if (inRange(bite, 0x40, 0x7e) || inRange(bite, 0x80, 0xfe))
        pointer = (lead - 0x81) * 190 + (bite - offset);

      // 5. Let code point be null if pointer is null and the index
      // code point for pointer in index gb18030 otherwise.
      codePoint = pointer === null ? null : indexCodePointFor(pointer, encodingIndex.gb18030);

      // 6. If code point is null and byte is an ASCII byte, prepend
      // byte to stream.
      if (codePoint === null && isASCIIByte(bite)) stream.prepend(bite);

      // 7. If code point is null, return error.
      if (codePoint === null) return decoderError(this.fatal);

      // 8. Return a code point whose value is code point.
      return codePoint;
    }

    // 6. If byte is an ASCII byte, return a code point whose value
    // is byte.
    if (isASCIIByte(bite)) return bite;

    // 7. If byte is 0x80, return code point U+20AC.
    if (bite === 0x80) return 0x20ac;

    // 8. If byte is in the range 0x81 to 0xFE, inclusive, set
    // gb18030 first to byte and return continue.
    if (inRange(bite, 0x81, 0xfe)) {
      this.gb18030First = bite;

      return null;
    }

    // 9. Return error.
    return decoderError(this.fatal);
  }
}

class GB18030Encoder implements Encoder {
  gbkFlag = false;
  constructor(_options: { fatal: boolean }, gbkFlag?: boolean) {
    // gb18030's decoder has an associated gbk flag (initially unset).
    if (gbkFlag) this.gbkFlag = true;
  }

  /**
   * @param stream Input stream.
   * @param codePoint Next code point read from the stream.
   * @returns Byte(s) to emit.
   */
  handler(_stream: Stream, codePoint: number): number | number[] {
    // 1. If code point is end-of-stream, return finished.
    if (codePoint === END_OF_STREAM) return FINISHED;

    // 2. If code point is an ASCII code point, return a byte whose
    // value is code point.
    if (isASCIIByte(codePoint)) return codePoint;

    // 3. If code point is U+E5E5, return error with code point.
    if (codePoint === 0xe5e5) return encoderError(codePoint);

    // 4. If the gbk flag is set and code point is U+20AC, return
    // byte 0x80.
    if (this.gbkFlag && codePoint === 0x20ac) return 0x80;

    // 5. Let pointer be the index pointer for code point in index
    // gb18030.
    let pointer = indexPointerFor(codePoint, encodingIndex.gb18030);

    // 6. If pointer is not null, run these substeps:
    if (pointer !== null) {
      // 1. Let lead be floor(pointer / 190) + 0x81.
      const lead = Math.floor(pointer / 190) + 0x81;

      // 2. Let trail be pointer % 190.
      const trail = pointer % 190;

      // 3. Let offset be 0x40 if trail is less than 0x3F and 0x41 otherwise.
      const offset = trail < 0x3f ? 0x40 : 0x41;

      // 4. Return two bytes whose values are lead and trail + offset.
      return [lead, trail + offset];
    }

    // 7. If gbk flag is set, return error with code point.
    if (this.gbkFlag) return encoderError(codePoint);

    // 8. Set pointer to the index gb18030 ranges pointer for code
    // point.
    pointer = indexGB18030RangesPointerFor(codePoint);

    // 9. Let byte1 be floor(pointer / 10 / 126 / 10).
    const byte1 = Math.floor(pointer / 10 / 126 / 10);

    // 10. Set pointer to pointer − byte1 × 10 × 126 × 10.
    pointer -= byte1 * 10 * 126 * 10;

    // 11. Let byte2 be floor(pointer / 10 / 126).
    const byte2 = Math.floor(pointer / 10 / 126);

    // 12. Set pointer to pointer − byte2 × 10 × 126.
    pointer -= byte2 * 10 * 126;

    // 13. Let byte3 be floor(pointer / 10).
    const byte3 = Math.floor(pointer / 10);

    // 14. Let byte4 be pointer − byte3 × 10.
    const byte4 = pointer - byte3 * 10;

    // 15. Return four bytes whose values are byte1 + 0x81, byte2 +
    // 0x30, byte3 + 0x81, byte4 + 0x30.
    return [byte1 + 0x81, byte2 + 0x30, byte3 + 0x81, byte4 + 0x30];
  }
}

decoders.gb18030 = (options): Decoder => new GB18030Decoder(options);
encoders.gb18030 = (options): Encoder => new GB18030Encoder(options);

// gbk's decoder is gb18030's decoder.
decoders.GBK = (options): Decoder => new GB18030Decoder(options);
// gbk's encoder is gb18030's encoder with its gbk flag set.
encoders.GBK = (options): Encoder => new GB18030Encoder(options, true);
