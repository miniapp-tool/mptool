/**
 * @param fatal If true, decoding errors raise an exception.
 * @param codePoint Override the standard fallback code point.
 * @return The code point to insert on a decoding error.
 */
export const decoderError = (fatal: boolean, codePoint?: number): number => {
  if (fatal) throw TypeError("Decoder error");

  return codePoint || 0xfffd;
};

/**
 * @param {number} codePoint The code point that could not be encoded.
 * @return {number} Always throws, no value is actually returned.
 */
export const encoderError = (codePoint: number): void => {
  throw TypeError("The code point " + codePoint + " could not be encoded.");
};
