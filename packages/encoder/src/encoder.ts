import { END_OF_STREAM, FINISHED } from "./constant.js";
import { encodingIndex } from "./indexes.js";
import { Stream } from "./stream.js";
import { Decoder, decoders } from "./textDecoder.js";
import { encoders } from "./textEncoder.js";
import { inRange, isASCIIByte } from "./utils.js";

//
// 5. Encodings
//

// 5.1 Encoders and decoders

/**
 * @param fatal If true, decoding errors raise an exception.
 * @param codePoint Override the standard fallback code point.
 * @return The code point to insert on a decoding error.
 */
const decoderError = (fatal: boolean, codePoint?: number): number => {
  if (fatal) throw TypeError("Decoder error");

  return codePoint || 0xfffd;
};

/**
 * @param {number} codePoint The code point that could not be encoded.
 * @return {number} Always throws, no value is actually returned.
 */
const encoderError = (codePoint: number): void => {
  throw TypeError("The code point " + codePoint + " could not be encoded.");
};

// 5.2 Names and labels

// TODO: Define @typedef for Encoding: {name:string,labels:Array.<string>}
// https://github.com/google/closure-compiler/issues/247

//
// 6. Indexes
//

/**
 * @param pointer The |pointer| to search for.
 * @param index The |index| to search within.
 * @return The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in |index|.
 */
const indexCodePointFor = (
  pointer: number,
  index: number[] | undefined
): number | null => {
  if (!index) return null;
  return index[pointer] || null;
};

/**
 * @param codePoint The |code point| to search for.
 * @param index The |index| to search within.
 * @return The first pointer corresponding to |code point| in
 *     |index|, or null if |code point| is not in |index|.
 */
const indexPointerFor = (codePoint: number, index: number[]): number | null => {
  const pointer = index.indexOf(codePoint);
  return pointer === -1 ? null : pointer;
};

/**
 * @param pointer The |pointer| to search for in the gb18030 index.
 * @return The code point corresponding to |pointer| in |index|,
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
 * @return The first pointer corresponding to |code point| in the
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

/**
 * @param {{fatal: boolean}} options
 */
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
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
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
    this.utf8CodePoint = this.utf8BytesNeeded = this.utf8BytesSeen = 0;

    // 11. Return a code point whose value is code point.
    return codePoint;
  }
}

// 9.1.2 utf-8 encoder
/**
 * @constructor
 * @implements {Encoder}
 * @param {{fatal: boolean}} options
 */
function UTF8Encoder(_options) {
  /**
   * @param {Stream} stream Input stream.
   * @param {number} code_point Next code point read from the stream.
   * @return {(number|!Array.<number>)} Byte(s) to emit.
   */
  this.handler = function (_stream, code_point) {
    // 1. If code point is end-of-stream, return finished.
    if (code_point === END_OF_STREAM) return FINISHED;

    // 2. If code point is an ASCII code point, return a byte whose
    // value is code point.
    if (isASCIIByte(code_point)) return code_point;

    // 3. Set count and offset based on the range code point is in:
    let count, offset;
    // U+0080 to U+07FF, inclusive:
    if (inRange(code_point, 0x0080, 0x07ff)) {
      // 1 and 0xC0
      count = 1;
      offset = 0xc0;
    }
    // U+0800 to U+FFFF, inclusive:
    else if (inRange(code_point, 0x0800, 0xffff)) {
      // 2 and 0xE0
      count = 2;
      offset = 0xe0;
    }
    // U+10000 to U+10FFFF, inclusive:
    else if (inRange(code_point, 0x10000, 0x10ffff)) {
      // 3 and 0xF0
      count = 3;
      offset = 0xf0;
    }

    // 4. Let bytes be a byte sequence whose first byte is (code
    // point >> (6 × count)) + offset.
    const bytes = [(code_point >> (6 * count)) + offset];

    // 5. Run these substeps while count is greater than 0:
    while (count > 0) {
      // 1. Set temp to code point >> (6 × (count − 1)).
      const temp = code_point >> (6 * (count - 1));

      // 2. Append to bytes 0x80 | (temp & 0x3F).
      bytes.push(0x80 | (temp & 0x3f));

      // 3. Decrease count by one.
      count -= 1;
    }

    // 6. Return bytes bytes, in order.
    return bytes;
  };
}

/** @param {{fatal: boolean}} options */
encoders["UTF-8"] = function (options) {
  return new UTF8Encoder(options);
};
/** @param {{fatal: boolean}} options */
decoders["UTF-8"] = function (options) {
  return new UTF8Decoder(options);
};

//
// 11. Legacy multi-byte Chinese (simplified) encodings
//

// 11.1 gbk

// 11.1.1 gbk decoder
// gbk's decoder is gb18030's decoder.
/** @param {{fatal: boolean}} options */
decoders["GBK"] = function (options) {
  return new GB18030Decoder(options);
};

// 11.1.2 gbk encoder
// gbk's encoder is gb18030's encoder with its gbk flag set.
/** @param {{fatal: boolean}} options */
encoders["GBK"] = function (options) {
  return new GB18030Encoder(options, true);
};

// 11.2 gb18030

// 11.2.1 gb18030 decoder
/**
 * @constructor
 * @implements {Decoder}
 * @param {{fatal: boolean}} options
 */
function GB18030Decoder(options) {
  const fatal = options.fatal;
  // gb18030's decoder has an associated gb18030 first, gb18030
  // second, and gb18030 third (all initially 0x00).
  let gb18030_first = 0x00,
    gb18030_second = 0x00,
    gb18030_third = 0x00;
  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  this.handler = function (stream, bite) {
    // 1. If byte is end-of-stream and gb18030 first, gb18030
    // second, and gb18030 third are 0x00, return finished.
    if (
      bite === END_OF_STREAM &&
      gb18030_first === 0x00 &&
      gb18030_second === 0x00 &&
      gb18030_third === 0x00
    ) {
      return FINISHED;
    }
    // 2. If byte is end-of-stream, and gb18030 first, gb18030
    // second, or gb18030 third is not 0x00, set gb18030 first,
    // gb18030 second, and gb18030 third to 0x00, and return error.
    if (
      bite === END_OF_STREAM &&
      (gb18030_first !== 0x00 ||
        gb18030_second !== 0x00 ||
        gb18030_third !== 0x00)
    ) {
      gb18030_first = 0x00;
      gb18030_second = 0x00;
      gb18030_third = 0x00;
      decoderError(fatal);
    }
    let code_point;
    // 3. If gb18030 third is not 0x00, run these substeps:
    if (gb18030_third !== 0x00) {
      // 1. Let code point be null.
      code_point = null;
      // 2. If byte is in the range 0x30 to 0x39, inclusive, set
      // code point to the index gb18030 ranges code point for
      // (((gb18030 first − 0x81) × 10 + gb18030 second − 0x30) ×
      // 126 + gb18030 third − 0x81) × 10 + byte − 0x30.
      if (inRange(bite, 0x30, 0x39)) {
        code_point = indexGB18030RangesCodePointFor(
          (((gb18030_first - 0x81) * 10 + gb18030_second - 0x30) * 126 +
            gb18030_third -
            0x81) *
            10 +
            bite -
            0x30
        );
      }

      // 3. Let buffer be a byte sequence consisting of gb18030
      // second, gb18030 third, and byte, in order.
      const buffer = [gb18030_second, gb18030_third, bite];

      // 4. Set gb18030 first, gb18030 second, and gb18030 third to
      // 0x00.
      gb18030_first = 0x00;
      gb18030_second = 0x00;
      gb18030_third = 0x00;

      // 5. If code point is null, prepend buffer to stream and
      // return error.
      if (code_point === null) {
        stream.prepend(buffer);
        return decoderError(fatal);
      }

      // 6. Return a code point whose value is code point.
      return code_point;
    }

    // 4. If gb18030 second is not 0x00, run these substeps:
    if (gb18030_second !== 0x00) {
      // 1. If byte is in the range 0x81 to 0xFE, inclusive, set
      // gb18030 third to byte and return continue.
      if (inRange(bite, 0x81, 0xfe)) {
        gb18030_third = bite;
        return null;
      }

      // 2. Prepend gb18030 second followed by byte to stream, set
      // gb18030 first and gb18030 second to 0x00, and return error.
      stream.prepend([gb18030_second, bite]);
      gb18030_first = 0x00;
      gb18030_second = 0x00;
      return decoderError(fatal);
    }

    // 5. If gb18030 first is not 0x00, run these substeps:
    if (gb18030_first !== 0x00) {
      // 1. If byte is in the range 0x30 to 0x39, inclusive, set
      // gb18030 second to byte and return continue.
      if (inRange(bite, 0x30, 0x39)) {
        gb18030_second = bite;
        return null;
      }

      // 2. Let lead be gb18030 first, let pointer be null, and set
      // gb18030 first to 0x00.
      const lead = gb18030_first;
      let pointer = null;
      gb18030_first = 0x00;

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
      code_point =
        pointer === null
          ? null
          : indexCodePointFor(pointer, encodingIndex["gb18030"]);

      // 6. If code point is null and byte is an ASCII byte, prepend
      // byte to stream.
      if (code_point === null && isASCIIByte(bite)) stream.prepend(bite);

      // 7. If code point is null, return error.
      if (code_point === null) return decoderError(fatal);

      // 8. Return a code point whose value is code point.
      return code_point;
    }

    // 6. If byte is an ASCII byte, return a code point whose value
    // is byte.
    if (isASCIIByte(bite)) return bite;

    // 7. If byte is 0x80, return code point U+20AC.
    if (bite === 0x80) return 0x20ac;

    // 8. If byte is in the range 0x81 to 0xFE, inclusive, set
    // gb18030 first to byte and return continue.
    if (inRange(bite, 0x81, 0xfe)) {
      gb18030_first = bite;
      return null;
    }

    // 9. Return error.
    return decoderError(fatal);
  };
}

// 11.2.2 gb18030 encoder
/**
 * @constructor
 * @implements {Encoder}
 * @param {{fatal: boolean}} options
 * @param {boolean=} gbk_flag
 */
function GB18030Encoder(_options, gbk_flag?: boolean) {
  // gb18030's decoder has an associated gbk flag (initially unset).
  /**
   * @param {Stream} stream Input stream.
   * @param {number} code_point Next code point read from the stream.
   * @return {(number|!Array.<number>)} Byte(s) to emit.
   */
  this.handler = function (_stream, code_point: number) {
    // 1. If code point is end-of-stream, return finished.
    if (code_point === END_OF_STREAM) return FINISHED;

    // 2. If code point is an ASCII code point, return a byte whose
    // value is code point.
    if (isASCIIByte(code_point)) return code_point;

    // 3. If code point is U+E5E5, return error with code point.
    if (code_point === 0xe5e5) return encoderError(code_point);

    // 4. If the gbk flag is set and code point is U+20AC, return
    // byte 0x80.
    if (gbk_flag && code_point === 0x20ac) return 0x80;

    // 5. Let pointer be the index pointer for code point in index
    // gb18030.
    let pointer = indexPointerFor(code_point, encodingIndex["gb18030"]);

    // 6. If pointer is not null, run these substeps:
    if (pointer !== null) {
      // 1. Let lead be floor(pointer / 190) + 0x81.
      const lead = floor(pointer / 190) + 0x81;

      // 2. Let trail be pointer % 190.
      const trail = pointer % 190;

      // 3. Let offset be 0x40 if trail is less than 0x3F and 0x41 otherwise.
      const offset = trail < 0x3f ? 0x40 : 0x41;

      // 4. Return two bytes whose values are lead and trail + offset.
      return [lead, trail + offset];
    }

    // 7. If gbk flag is set, return error with code point.
    if (gbk_flag) return encoderError(code_point);

    // 8. Set pointer to the index gb18030 ranges pointer for code
    // point.
    pointer = indexGB18030RangesPointerFor(code_point);

    // 9. Let byte1 be floor(pointer / 10 / 126 / 10).
    const byte1 = Math.floor(pointer / 10 / 126 / 10);

    // 10. Set pointer to pointer − byte1 × 10 × 126 × 10.
    pointer = pointer - byte1 * 10 * 126 * 10;

    // 11. Let byte2 be floor(pointer / 10 / 126).
    const byte2 = Math.floor(pointer / 10 / 126);

    // 12. Set pointer to pointer − byte2 × 10 × 126.
    pointer = pointer - byte2 * 10 * 126;

    // 13. Let byte3 be floor(pointer / 10).
    const byte3 = Math.floor(pointer / 10);

    // 14. Let byte4 be pointer − byte3 × 10.
    const byte4 = pointer - byte3 * 10;

    // 15. Return four bytes whose values are byte1 + 0x81, byte2 +
    // 0x30, byte3 + 0x81, byte4 + 0x30.
    return [byte1 + 0x81, byte2 + 0x30, byte3 + 0x81, byte4 + 0x30];
  };
}

/** @param {{fatal: boolean}} options */
encoders["gb18030"] = function (options) {
  return new GB18030Encoder(options);
};
/** @param {{fatal: boolean}} options */
decoders["gb18030"] = function (options) {
  return new GB18030Decoder(options);
};
