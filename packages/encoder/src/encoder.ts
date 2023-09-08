import { encodingIndex } from "./encodingIndex.js";
import {
  inRange,
  toDict,
  stringToCodePoints,
  codePointsToString,
  isASCIIByte,
} from "./utils.js";

//
// Implementation of Encoding specification
// https://encoding.spec.whatwg.org/
//

//
// 4. Terminology
//

/**
 * End-of-stream is a special token that signifies no more tokens
 * are in the stream.
 */
const END_OF_STREAM = -1;

/**
 * A stream represents an ordered sequence of tokens.
 *
 * @constructor
 * @param {!(Array.<number>|Uint8Array)} tokens Array of tokens that provide
 * the stream.
 */
function Stream(tokens: number[] | Uint8Array) {
  /** @type {!Array.<number>} */
  this.tokens = [].slice.call(tokens);
  // Reversed as push/pop is more efficient than shift/unshift.
  this.tokens.reverse();
}

Stream.prototype = {
  /**
   * @return {boolean} True if end-of-stream has been hit.
   */
  endOfStream: function (): boolean {
    return !this.tokens.length;
  },

  /**
   * When a token is read from a stream, the first token in the
   * stream must be returned and subsequently removed, and
   * end-of-stream must be returned otherwise.
   *
   * @return {number} Get the next token from the stream, or
   * end_of_stream.
   */
  read: function (): number {
    if (!this.tokens.length) return END_OF_STREAM;

    return this.tokens.pop();
  },

  /**
   * When one or more tokens are prepended to a stream, those tokens
   * must be inserted, in given order, before the first token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The token(s) to prepend to the
   * stream.
   */
  prepend: function (token: number | number[]): void {
    if (Array.isArray(token)) {
      while (token.length) this.tokens.push(token.pop());
    } else {
      this.tokens.push(token);
    }
  },

  /**
   * When one or more tokens are pushed to a stream, those tokens
   * must be inserted, in given order, after the last token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The tokens(s) to push to the
   * stream.
   */
  push: function (token: number | number[]): void {
    if (Array.isArray(token)) {
      while (token.length) this.tokens.unshift(token.shift());
    } else {
      this.tokens.unshift(token);
    }
  },
};

//
// 5. Encodings
//

// 5.1 Encoders and decoders

/** @const */
const FINISHED = -1;

/**
 * @param fatal If true, decoding errors raise an exception.
 * @param opt_code_point Override the standard fallback code point.
 * @return The code point to insert on a decoding error.
 */
function decoderError(fatal: boolean, opt_code_point?: number): number {
  if (fatal) throw TypeError("Decoder error");

  return opt_code_point || 0xfffd;
}

/**
 * @param {number} code_point The code point that could not be encoded.
 * @return {number} Always throws, no value is actually returned.
 */
function encoderError(code_point: number): void {
  throw TypeError("The code point " + code_point + " could not be encoded.");
}

/** @interface */
function Decoder() {}
Decoder.prototype = {
  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point, or |finished|.
   */
  handler: function (_stream, _bite) {},
};

/** @interface */
function Encoder() {}
Encoder.prototype = {
  /**
   * @param {Stream} stream The stream of code points being encoded.
   * @param {number} code_point Next code point read from the stream.
   * @return {(number|!Array.<number>)} Byte(s) to emit, or |finished|.
   */
  handler: function (_stream, _code_point: number) {},
};

// 5.2 Names and labels

// TODO: Define @typedef for Encoding: {name:string,labels:Array.<string>}
// https://github.com/google/closure-compiler/issues/247

/**
 * @param {string} label The encoding label.
 * @return {?{name:string,labels:Array.<string>}}
 */
function getEncoding(label: string): { name: string; labels: string[] } | null {
  // 1. Remove any leading and trailing ASCII whitespace from label.
  label = String(label).trim().toLowerCase();

  // 2. If label is an ASCII case-insensitive match for any of the
  // labels listed in the table below, return the corresponding
  // encoding, and failure otherwise.
  if (Object.prototype.hasOwnProperty.call(label_to_encoding, label)) {
    return label_to_encoding[label];
  }
  return null;
}

/**
 * Encodings table: https://encoding.spec.whatwg.org/encodings.json
 * @const
 * @type {!Array.<{
 *          heading: string,
 *          encodings: Array.<{name:string,labels:Array.<string>}>
 *        }>}
 */
const encodings = [
  {
    encodings: [
      {
        labels: ["unicode-1-1-utf-8", "utf-8", "utf8"],
        name: "UTF-8",
      },
    ],
    heading: "The Encoding",
  },
  {
    encodings: [
      {
        labels: [
          "chinese",
          "csgb2312",
          "csiso58gb231280",
          "gb2312",
          "gb_2312",
          "gb_2312-80",
          "gbk",
          "iso-ir-58",
          "x-gbk",
        ],
        name: "GBK",
      },
      {
        labels: ["gb18030"],
        name: "gb18030",
      },
    ],
    heading: "Legacy multi-byte Chinese (simplified) encodings",
  },
];

// Label to encoding registry.
/** @type {Object.<string,{name:string,labels:Array.<string>}>} */
const label_to_encoding: Record<string, { name: string; labels: string[] }> =
  {};

encodings.forEach(function (category) {
  category.encodings.forEach(function (encoding) {
    encoding.labels.forEach(function (label) {
      label_to_encoding[label] = encoding;
    });
  });
});

// Registry of of encoder/decoder factories, by encoding name.
/** @type {Object.<string, function({fatal:boolean}): Encoder>} */
const encoders: Record<
  string,
  (options: { fatal: boolean }) => typeof Encoder
> = {};
/** @type {Object.<string, function({fatal:boolean}): Decoder>} */
const decoders: Record<
  string,
  (options: { fatal: boolean }) => typeof Decoder
> = {};

//
// 6. Indexes
//

/**
 * @param {number} pointer The |pointer| to search for.
 * @param {(!Array.<?number>|undefined)} index The |index| to search within.
 * @return {?number} The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in |index|.
 */
function indexCodePointFor(pointer, index) {
  if (!index) return null;
  return index[pointer] || null;
}

/**
 * @param {number} code_point The |code point| to search for.
 * @param {!Array.<?number>} index The |index| to search within.
 * @return {?number} The first pointer corresponding to |code point| in
 *     |index|, or null if |code point| is not in |index|.
 */
function indexPointerFor(code_point, index) {
  const pointer = index.indexOf(code_point);
  return pointer === -1 ? null : pointer;
}

/**
 * @param {string} name Name of the index.
 * @return {(!Array.<number>|!Array.<Array.<number>>)}
 *  */
function index(name) {
  return encodingIndex[name];
}

/**
 * @param {number} pointer The |pointer| to search for in the gb18030 index.
 * @return {?number} The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in the gb18030 index.
 */
function indexGB18030RangesCodePointFor(pointer) {
  // 1. If pointer is greater than 39419 and less than 189000, or
  // pointer is greater than 1237575, return null.
  if ((pointer > 39419 && pointer < 189000) || pointer > 1237575) return null;

  // 2. If pointer is 7457, return code point U+E7C7.
  if (pointer === 7457) return 0xe7c7;

  // 3. Let offset be the last pointer in index gb18030 ranges that
  // is equal to or less than pointer and let code point offset be
  // its corresponding code point.
  let offset = 0;
  let code_point_offset = 0;
  const idx = index("gb18030-ranges");
  let i;
  for (i = 0; i < idx.length; ++i) {
    /** @type {!Array.<number>} */
    const entry = idx[i];
    if (entry[0] <= pointer) {
      offset = entry[0];
      code_point_offset = entry[1];
    } else {
      break;
    }
  }

  // 4. Return a code point whose value is code point offset +
  // pointer − offset.
  return code_point_offset + pointer - offset;
}

/**
 * @param {number} code_point The |code point| to locate in the gb18030 index.
 * @return {number} The first pointer corresponding to |code point| in the
 *     gb18030 index.
 */
function indexGB18030RangesPointerFor(code_point) {
  // 1. If code point is U+E7C7, return pointer 7457.
  if (code_point === 0xe7c7) return 7457;

  // 2. Let offset be the last code point in index gb18030 ranges
  // that is equal to or less than code point and let pointer offset
  // be its corresponding pointer.
  let offset = 0;
  let pointer_offset = 0;
  const idx = index("gb18030-ranges");
  let i;
  for (i = 0; i < idx.length; ++i) {
    /** @type {!Array.<number>} */
    const entry = idx[i];
    if (entry[1] <= code_point) {
      offset = entry[1];
      pointer_offset = entry[0];
    } else {
      break;
    }
  }

  // 3. Return a pointer whose value is pointer offset + code point
  // − offset.
  return pointer_offset + code_point - offset;
}

//
// 8. API
//

/** @const */ const DEFAULT_ENCODING = "utf-8";

// 8.1 Interface TextDecoder

/**
 * @constructor
 * @param {string=} label The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {Object=} options
 */
export function TextDecoder(label, options) {
  // Web IDL conventions
  if (!(this instanceof TextDecoder))
    throw TypeError("Called as a function. Did you forget 'new'?");
  label = label !== undefined ? String(label) : DEFAULT_ENCODING;
  options = toDict(options);

  // A TextDecoder object has an associated encoding, decoder,
  // stream, ignore BOM flag (initially unset), BOM seen flag
  // (initially unset), error mode (initially replacement), and do
  // not flush flag (initially unset).

  /** @private */
  this._encoding = null;
  /** @private @type {?Decoder} */
  this._decoder = null;
  /** @private @type {boolean} */
  this._ignoreBOM = false;
  /** @private @type {boolean} */
  this._BOMseen = false;
  /** @private @type {string} */
  this._error_mode = "replacement";
  /** @private @type {boolean} */
  this._do_not_flush = false;

  // 1. Let encoding be the result of getting an encoding from
  // label.
  const encoding = getEncoding(label);

  // 2. If encoding is failure or replacement, throw a RangeError.
  if (encoding === null || encoding.name === "replacement")
    throw RangeError("Unknown encoding: " + label);
  if (!decoders[encoding.name]) {
    throw Error(
      "Decoder not present." +
        " Did you forget to include encoding-indexes.js first?"
    );
  }

  // 3. Let dec be a new TextDecoder object.
  const dec = this;

  // 4. Set dec's encoding to encoding.
  dec._encoding = encoding;

  // 5. If options's fatal member is true, set dec's error mode to
  // fatal.
  if (options["fatal"]) dec._error_mode = "fatal";

  // 6. If options's ignoreBOM member is true, set dec's ignore BOM
  // flag.
  if (options["ignoreBOM"]) dec._ignoreBOM = true;

  // For pre-ES5 runtimes:
  if (!Object.defineProperty) {
    this.encoding = dec._encoding.name.toLowerCase();
    this.fatal = dec._error_mode === "fatal";
    this.ignoreBOM = dec._ignoreBOM;
  }

  // 7. Return dec.
  return dec;
}

if (Object.defineProperty) {
  // The encoding attribute's getter must return encoding's name.
  Object.defineProperty(TextDecoder.prototype, "encoding", {
    /** @this {TextDecoder} */
    get: function () {
      return this._encoding.name.toLowerCase();
    },
  });

  // The fatal attribute's getter must return true if error mode
  // is fatal, and false otherwise.
  Object.defineProperty(TextDecoder.prototype, "fatal", {
    /** @this {TextDecoder} */
    get: function () {
      return this._error_mode === "fatal";
    },
  });

  // The ignoreBOM attribute's getter must return true if ignore
  // BOM flag is set, and false otherwise.
  Object.defineProperty(TextDecoder.prototype, "ignoreBOM", {
    /** @this {TextDecoder} */
    get: function () {
      return this._ignoreBOM;
    },
  });
}

/**
 * @param {BufferSource=} input The buffer of bytes to decode.
 * @param {Object=} options
 * @return {string} The decoded string.
 */
TextDecoder.prototype.decode = function decode(input, options) {
  let bytes;
  if (typeof input === "object" && input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (
    typeof input === "object" &&
    "buffer" in input &&
    input.buffer instanceof ArrayBuffer
  ) {
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else {
    bytes = new Uint8Array(0);
  }

  options = toDict(options);

  // 1. If the do not flush flag is unset, set decoder to a new
  // encoding's decoder, set stream to a new stream, and unset the
  // BOM seen flag.
  if (!this._do_not_flush) {
    this._decoder = decoders[this._encoding.name]({
      fatal: this._error_mode === "fatal",
    });
    this._BOMseen = false;
  }

  // 2. If options's stream is true, set the do not flush flag, and
  // unset the do not flush flag otherwise.
  this._do_not_flush = Boolean(options["stream"]);

  // 3. If input is given, push a copy of input to stream.
  // TODO: Align with spec algorithm - maintain stream on instance.
  const input_stream = new Stream(bytes);

  // 4. Let output be a new stream.
  const output = [];

  /** @type {?(number|!Array.<number>)} */
  let result;

  // 5. While true:
  while (true) {
    // 1. Let token be the result of reading from stream.
    const token = input_stream.read();

    // 2. If token is end-of-stream and the do not flush flag is
    // set, return output, serialized.
    // TODO: Align with spec algorithm.
    if (token === END_OF_STREAM) break;

    // 3. Otherwise, run these subsubsteps:

    // 1. Let result be the result of processing token for decoder,
    // stream, output, and error mode.
    result = this._decoder.handler(input_stream, token);

    // 2. If result is finished, return output, serialized.
    if (result === FINISHED) break;

    if (result !== null) {
      if (Array.isArray(result))
        output.push.apply(output, /**@type {!Array.<number>}*/ result);
      else output.push(result);
    }

    // 3. Otherwise, if result is error, throw a TypeError.
    // (Thrown in handler)

    // 4. Otherwise, do nothing.
  }
  // TODO: Align with spec algorithm.
  if (!this._do_not_flush) {
    do {
      result = this._decoder.handler(input_stream, input_stream.read());
      if (result === FINISHED) break;
      if (result === null) continue;
      if (Array.isArray(result))
        output.push.apply(output, /**@type {!Array.<number>}*/ result);
      else output.push(result);
    } while (!input_stream.endOfStream());
    this._decoder = null;
  }

  // A TextDecoder object also has an associated serialize stream
  // algorithm...
  /**
   * @param {!Array.<number>} stream
   * @return {string}
   * @this {TextDecoder}
   */
  function serializeStream(stream) {
    // 1. Let token be the result of reading from stream.
    // (Done in-place on array, rather than as a stream)

    // 2. If encoding is UTF-8, UTF-16BE, or UTF-16LE, and ignore
    // BOM flag and BOM seen flag are unset, run these subsubsteps:
    if (
      ["UTF-8", "UTF-16LE", "UTF-16BE"].includes(this._encoding.name) &&
      !this._ignoreBOM &&
      !this._BOMseen
    ) {
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
    }
    // 4. Otherwise, return output.
    return codePointsToString(stream);
  }

  return serializeStream.call(this, output);
};

// 8.2 Interface TextEncoder

/**
 * @constructor
 * @param {string=} label The label of the encoding. NONSTANDARD.
 * @param {Object=} options NONSTANDARD.
 */
export function TextEncoder(label, options) {
  // Web IDL conventions
  if (!(this instanceof TextEncoder))
    throw TypeError("Called as a function. Did you forget 'new'?");
  options = ToDictionary(options);

  // A TextEncoder object has an associated encoding and encoder.

  /** @private */
  this._encoding = null;
  /** @private @type {?Encoder} */
  this._encoder = null;

  // Non-standard
  /** @private @type {boolean} */
  this._do_not_flush = false;
  /** @private @type {string} */
  this._fatal = options["fatal"] ? "fatal" : "replacement";

  // 1. Let enc be a new TextEncoder object.
  const enc = this;

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
    enc._encoding = encoding;
  } else {
    // Standard behavior.
    enc._encoding = getEncoding("utf-8");

    if (label !== undefined && "console" in global) {
      console.warn(
        "TextEncoder constructor called with encoding label, " +
          "which is ignored."
      );
    }
  }

  // For pre-ES5 runtimes:
  if (!Object.defineProperty) this.encoding = enc._encoding.name.toLowerCase();

  // 3. Return enc.
  return enc;
}

if (Object.defineProperty) {
  // The encoding attribute's getter must return encoding's name.
  Object.defineProperty(TextEncoder.prototype, "encoding", {
    /** @this {TextEncoder} */
    get: function () {
      return this._encoding.name.toLowerCase();
    },
  });
}

/**
 * @param {string=} opt_string The string to encode.
 * @param {Object=} options
 * @return {!Uint8Array} Encoded bytes, as a Uint8Array.
 */
TextEncoder.prototype.encode = function encode(opt_string, options) {
  opt_string = opt_string === undefined ? "" : String(opt_string);
  options = ToDictionary(options);

  // NOTE: This option is nonstandard. None of the encodings
  // permitted for encoding (i.e. UTF-8, UTF-16) are stateful when
  // the input is a USVString so streaming is not necessary.
  if (!this._do_not_flush)
    this._encoder = encoders[this._encoding.name]({
      fatal: this._fatal === "fatal",
    });
  this._do_not_flush = Boolean(options["stream"]);

  // 1. Convert input to a stream.
  const input = new Stream(stringToCodePoints(opt_string));

  // 2. Let output be a new stream
  const output = [];

  /** @type {?(number|!Array.<number>)} */
  let result;
  // 3. While true, run these substeps:
  while (true) {
    // 1. Let token be the result of reading from input.
    const token = input.read();
    if (token === END_OF_STREAM) break;
    // 2. Let result be the result of processing token for encoder,
    // input, output.
    result = this._encoder.handler(input, token);
    if (result === FINISHED) break;
    if (Array.isArray(result))
      output.push.apply(output, /**@type {!Array.<number>}*/ result);
    else output.push(result);
  }
  // TODO: Align with spec algorithm.
  if (!this._do_not_flush) {
    while (true) {
      result = this._encoder.handler(input, input.read());
      if (result === FINISHED) break;
      if (Array.isArray(result))
        output.push.apply(output, /**@type {!Array.<number>}*/ result);
      else output.push(result);
    }
    this._encoder = null;
  }
  // 3. If result is finished, convert output into a byte sequence,
  // and then return a Uint8Array object wrapping an ArrayBuffer
  // containing output.
  return new Uint8Array(output);
};

//
// 9. The encoding
//

// 9.1 utf-8

// 9.1.1 utf-8 decoder
/**
 * @constructor
 * @implements {Decoder}
 * @param {{fatal: boolean}} options
 */
function UTF8Decoder(options) {
  const fatal = options.fatal;

  // utf-8's decoder's has an associated utf-8 code point, utf-8
  // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
  // lower boundary (initially 0x80), and a utf-8 upper boundary
  // (initially 0xBF).
  let /** @type {number} */ utf8_code_point = 0,
    /** @type {number} */ utf8_bytes_seen = 0,
    /** @type {number} */ utf8_bytes_needed = 0,
    /** @type {number} */ utf8_lower_boundary = 0x80,
    /** @type {number} */ utf8_upper_boundary = 0xbf;

  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  this.handler = function (stream, bite) {
    // 1. If byte is end-of-stream and utf-8 bytes needed is not 0,
    // set utf-8 bytes needed to 0 and return error.
    if (bite === END_OF_STREAM && utf8_bytes_needed !== 0) {
      utf8_bytes_needed = 0;
      return decoderError(fatal);
    }

    // 2. If byte is end-of-stream, return finished.
    if (bite === END_OF_STREAM) return FINISHED;

    // 3. If utf-8 bytes needed is 0, based on byte:
    if (utf8_bytes_needed === 0) {
      // 0x00 to 0x7F
      if (inRange(bite, 0x00, 0x7f)) {
        // Return a code point whose value is byte.
        return bite;
      }

      // 0xC2 to 0xDF
      else if (inRange(bite, 0xc2, 0xdf)) {
        // 1. Set utf-8 bytes needed to 1.
        utf8_bytes_needed = 1;

        // 2. Set UTF-8 code point to byte & 0x1F.
        utf8_code_point = bite & 0x1f;
      }

      // 0xE0 to 0xEF
      else if (inRange(bite, 0xe0, 0xef)) {
        // 1. If byte is 0xE0, set utf-8 lower boundary to 0xA0.
        if (bite === 0xe0) utf8_lower_boundary = 0xa0;
        // 2. If byte is 0xED, set utf-8 upper boundary to 0x9F.
        if (bite === 0xed) utf8_upper_boundary = 0x9f;
        // 3. Set utf-8 bytes needed to 2.
        utf8_bytes_needed = 2;
        // 4. Set UTF-8 code point to byte & 0xF.
        utf8_code_point = bite & 0xf;
      }

      // 0xF0 to 0xF4
      else if (inRange(bite, 0xf0, 0xf4)) {
        // 1. If byte is 0xF0, set utf-8 lower boundary to 0x90.
        if (bite === 0xf0) utf8_lower_boundary = 0x90;
        // 2. If byte is 0xF4, set utf-8 upper boundary to 0x8F.
        if (bite === 0xf4) utf8_upper_boundary = 0x8f;
        // 3. Set utf-8 bytes needed to 3.
        utf8_bytes_needed = 3;
        // 4. Set UTF-8 code point to byte & 0x7.
        utf8_code_point = bite & 0x7;
      }

      // Otherwise
      else {
        // Return error.
        return decoderError(fatal);
      }

      // Return continue.
      return null;
    }

    // 4. If byte is not in the range utf-8 lower boundary to utf-8
    // upper boundary, inclusive, run these substeps:
    if (!inRange(bite, utf8_lower_boundary, utf8_upper_boundary)) {
      // 1. Set utf-8 code point, utf-8 bytes needed, and utf-8
      // bytes seen to 0, set utf-8 lower boundary to 0x80, and set
      // utf-8 upper boundary to 0xBF.
      utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;
      utf8_lower_boundary = 0x80;
      utf8_upper_boundary = 0xbf;

      // 2. Prepend byte to stream.
      stream.prepend(bite);

      // 3. Return error.
      return decoderError(fatal);
    }

    // 5. Set utf-8 lower boundary to 0x80 and utf-8 upper boundary
    // to 0xBF.
    utf8_lower_boundary = 0x80;
    utf8_upper_boundary = 0xbf;

    // 6. Set UTF-8 code point to (UTF-8 code point << 6) | (byte &
    // 0x3F)
    utf8_code_point = (utf8_code_point << 6) | (bite & 0x3f);

    // 7. Increase utf-8 bytes seen by one.
    utf8_bytes_seen += 1;

    // 8. If utf-8 bytes seen is not equal to utf-8 bytes needed,
    // continue.
    if (utf8_bytes_seen !== utf8_bytes_needed) return null;

    // 9. Let code point be utf-8 code point.
    const code_point = utf8_code_point;

    // 10. Set utf-8 code point, utf-8 bytes needed, and utf-8 bytes
    // seen to 0.
    utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;

    // 11. Return a code point whose value is code point.
    return code_point;
  };
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
// 10. Legacy single-byte encodings
//

// 10.1 single-byte decoder
/**
 * @constructor
 * @implements {Decoder}
 * @param {!Array.<number>} index The encoding index.
 * @param {{fatal: boolean}} options
 */
function SingleByteDecoder(index: number[], options) {
  const fatal = options.fatal;
  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  this.handler = function (_stream, bite) {
    // 1. If byte is end-of-stream, return finished.
    if (bite === END_OF_STREAM) return FINISHED;

    // 2. If byte is an ASCII byte, return a code point whose value
    // is byte.
    if (isASCIIByte(bite)) return bite;

    // 3. Let code point be the index code point for byte − 0x80 in
    // index single-byte.
    const code_point = index[bite - 0x80];

    // 4. If code point is null, return error.
    if (code_point === null) return decoderError(fatal);

    // 5. Return a code point whose value is code point.
    return code_point;
  };
}

// 10.2 single-byte encoder
/**
 * @constructor
 * @implements {Encoder}
 * @param {!Array.<?number>} index The encoding index.
 * @param {{fatal: boolean}} options
 */
function SingleByteEncoder(index, _options) {
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

    // 3. Let pointer be the index pointer for code point in index
    // single-byte.
    const pointer = indexPointerFor(code_point, index);

    // 4. If pointer is null, return error with code point.
    if (pointer === null) encoderError(code_point);

    // 5. Return a byte whose value is pointer + 0x80.
    return pointer + 0x80;
  };
}

(function () {
  encodings.forEach(function (category) {
    if (category.heading !== "Legacy single-byte encodings") return;
    category.encodings.forEach(function (encoding) {
      const name = encoding.name;
      const idx = index(name.toLowerCase());
      /** @param {{fatal: boolean}} options */
      decoders[name] = function (options) {
        return new SingleByteDecoder(idx, options);
      };
      /** @param {{fatal: boolean}} options */
      encoders[name] = function (options) {
        return new SingleByteEncoder(idx, options);
      };
    });
  });
})();

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
  let /** @type {number} */ gb18030_first = 0x00,
    /** @type {number} */ gb18030_second = 0x00,
    /** @type {number} */ gb18030_third = 0x00;
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
        pointer === null ? null : indexCodePointFor(pointer, index("gb18030"));

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
    let pointer = indexPointerFor(code_point, index("gb18030"));

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
