const getLineColumn = (source: string, offset: number): { line: number; column: number } => {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
};

/**
 * Error thrown by the `Lexer` on illegal input, carrying source positions.
 *
 * 词法分析器在遇到非法输入时抛出的错误，包含源码位置信息。
 */
export class LexerError extends Error {
  /** Start offset of the offending range / 出错范围的起始偏移 */
  readonly start: number;

  /** End offset of the offending range / 出错范围的结束偏移 */
  readonly end: number;

  /** 1-based line number / 从 1 开始的行号 */
  readonly line: number;

  /** 1-based column number / 从 1 开始的列号 */
  readonly column: number;

  /**
   * @param message - Error message / 错误信息
   * @param source - Full source string / 完整源码
   * @param start - Start offset / 起始偏移
   * @param end - End offset / 结束偏移
   */
  constructor(message: string, source: string, start: number, end: number) {
    const { line, column } = getLineColumn(source, start);

    super(`${message} (line ${line}, column ${column})`);

    this.name = "LexerError";
    this.start = start;
    this.end = end;
    this.line = line;
    this.column = column;
  }
}
