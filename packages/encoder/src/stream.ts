import { END_OF_STREAM } from "./constant.js";

/**
 * A stream represents an ordered sequence of tokens.
 *
 * @constructor
 * @param tokens Array of tokens that provide
 * the stream.
 */
export class Stream {
  tokens: number[];

  constructor(tokens: number[] | Uint8Array) {
    this.tokens = [].slice.call(tokens);
    // Reversed as push/pop is more efficient than shift/unshift.
    this.tokens.reverse();
  }

  /**
   * @return True if end-of-stream has been hit.
   */
  endOfStream(): boolean {
    return this.tokens.length === 0;
  }

  /**
   * When a token is read from a stream, the first token in the
   * stream must be returned and subsequently removed, and
   * end-of-stream must be returned otherwise.
   *
   * @return Get the next token from the stream, or
   * end_of_stream.
   */
  read(): number {
    return this.tokens.pop() ?? END_OF_STREAM;
  }

  /**
   * When one or more tokens are prepended to a stream, those tokens
   * must be inserted, in given order, before the first token in the
   * stream.
   *
   * @param token The token(s) to prepend to the
   * stream.
   */
  prepend(token: number | number[]): void {
    if (Array.isArray(token))
      // oxlint-disable-next-line typescript/no-non-null-assertion
      while (token.length > 0) this.tokens.push(token.pop()!);
    else this.tokens.push(token);
  }

  /**
   * When one or more tokens are pushed to a stream, those tokens
   * must be inserted, in given order, after the last token in the
   * stream.
   *
   * @param token The tokens(s) to push to the
   * stream.
   */
  push(token: number | number[]): void {
    if (Array.isArray(token))
      // oxlint-disable-next-line typescript/no-non-null-assertion
      while (token.length > 0) this.tokens.unshift(token.shift()!);
    else this.tokens.unshift(token);
  }
}
