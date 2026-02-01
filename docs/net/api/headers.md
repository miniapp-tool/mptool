# Headers

更多信息请参考 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Headers)。

```ts
export type HeadersInit = [string, string][] | Record<string, string> | Headers;

export class Headers {
  private [NORMALIZED_HEADERS];
  private [RAW_HEADER_NAMES];
  constructor(init?: HeadersInit);
  /**
   * Appends a new value onto an existing header inside a `Headers` object, or adds the header if it does not already exist.
   */
  append(name: string, value: string): void;
  /**
   * Deletes a header from the `Headers` object.
   */
  delete(name: string): void;
  /**
   * Returns a `ByteString` sequence of all the values of a header with a given name.
   */
  get(name: string): string | null;
  /**
   * Returns an array containing the values
   * of all Set-Cookie headers associated
   * with a response
   */
  getSetCookie(): string[];
  /**
   * Returns a boolean stating whether a `Headers` object contains a certain header.
   */
  has(name: string): boolean;
  /**
   * Sets a new value for an existing header inside a `Headers` object, or adds the header if it does not already exist.
   */
  set(name: string, value: string): void;
  /**
   * Traverses the `Headers` object,
   * calling the given callback for each header.
   */
  forEach<ThisArg = this>(
    callback: (this: ThisArg, value: string, name: string, parent: this) => void,
    thisArg?: ThisArg,
  ): void;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  entries(): IterableIterator<[string, string]>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
```
