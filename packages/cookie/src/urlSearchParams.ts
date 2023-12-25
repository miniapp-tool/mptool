const replace: Record<string, string> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "!": "%21",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "'": "%27",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "(": "%28",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ")": "%29",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "~": "%7E",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "%20": "+",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "%00": "\x00",
};

const encode = (str: string): string =>
  encodeURIComponent(str).replace(
    /[!'()~]|%20|%00/g,
    (match) => replace[match],
  );

const decode = (str: string): string =>
  decodeURIComponent(str.replace(/\+/g, " "));

export class URLSearchParams {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private params: Map<string, string[]>;

  constructor(
    init?:
      | URLSearchParams
      | string
      | Record<string, string | string[]>
      | Iterable<[string, string]>,
  ) {
    if (!init) this.params = new Map();
    else if (init instanceof URLSearchParams) {
      this.params = new Map(init.params);
    } else {
      this.params = new Map();

      if (typeof init === "string")
        (init.indexOf("?") === 0
          ? // remove first '?'
            init.slice(1)
          : init
        )
          .split("&")
          .map((pair) => {
            const [, key, value] = /^(.+?)=(.*?)$/.exec(pair) ?? [];

            this.append(decode(key), decode(value));
          });
      else if (Symbol.iterator in init)
        for (const [key, value] of init)
          this.params.set(key, Array.isArray(value) ? value : [value]);
      else
        for (const key of Object.keys(init)) {
          const value = init[key];

          this.params.set(key, Array.isArray(value) ? value : [value]);
        }
    }
  }

  get size(): number {
    return this.params.size;
  }

  /**
   * Append a new name-value pair to the query string.
   */
  append(name: string, value: string): void {
    this.params.set(name, this.getAll(name).concat(value) ?? [value]);
  }

  /**
   * If `value` is provided, removes all name-value pairs
   * where name is `name` and value is `value`..
   *
   * If `value` is not provided, removes all name-value pairs whose name is `name`.
   */
  delete(name: string): void {
    this.params.delete(name);
  }

  /**
   * Returns an ES6 `Iterator` over each of the name-value pairs in the query.
   * Each item of the iterator is a JavaScript `Array`. The first item of the `Array`is the `name`, the second item of the `Array` is the `value`.
   *
   * Alias for `urlSearchParams[@@iterator]()`.
   */
  entries(): IterableIterator<[string, string]> {
    const items = new Set<[name: string, value: string]>();

    this.forEach((item, name) => {
      items.add([name, item]);
    });

    return items.values();
  }

  /**
   * Iterates over each name-value pair in the query and invokes the given function.
   *
   * ```js
   * const myURL = new URL('https://example.org/?a=b&#x26;c=d');
   * myURL.searchParams.forEach((value, name, searchParams) => {
   *   console.log(name, value, myURL.searchParams === searchParams);
   * });
   * // Prints:
   * //   a b true
   * //   c d true
   * ```
   * @param fn Invoked for each name-value pair in the query
   * @param thisArg To be used as `this` value for when `fn` is called
   */
  forEach(
    callbackfn: (value: string, key: string, iterable: URLSearchParams) => void,
    thisArg?: unknown,
  ): void {
    this.params.forEach((value, key) =>
      value.forEach((item) => callbackfn.bind(thisArg)(item, key, this)),
    );
  }

  /**
   * Returns the value of the first name-value pair whose name is `name`. If there
   * are no such pairs, `null` is returned.
   * @return or `null` if there is no name-value pair with the given `name`.
   */
  get(name: string): string | null {
    return this.getAll(name)?.[0] ?? null;
  }

  /**
   * Returns the values of all name-value pairs whose name is `name`. If there are
   * no such pairs, an empty array is returned.
   */
  getAll(name: string): string[] {
    return this.has(name) ? this.params.get(name)!.slice(0) : [];
  }

  /**
   * Checks if the `URLSearchParams` object contains key-value pair(s) based on`name` and an optional `value` argument.
   *
   * If `value` is provided, returns `true` when name-value pair with
   * same `name` and `value` exists.
   *
   * If `value` is not provided, returns `true` if there is at least one name-value
   * pair whose name is `name`.
   */
  has(name: string): boolean {
    return this.params.has(name);
  }

  /**
   * Returns an ES6 `Iterator` over the names of each name-value pair.
   *
   * ```js
   * const params = new URLSearchParams('foo=bar&#x26;foo=baz');
   * for (const name of params.keys()) {
   *   console.log(name);
   * }
   * // Prints:
   * //   foo
   * //   foo
   * ```
   */
  keys(): IterableIterator<string> {
    return this.params.keys();
  }

  /**
   * Sets the value in the `URLSearchParams` object associated with `name` to`value`. If there are any pre-existing name-value pairs whose names are `name`,
   * set the first such pair's value to `value` and remove all others. If not,
   * append the name-value pair to the query string.
   *
   * ```js
   * const params = new URLSearchParams();
   * params.append('foo', 'bar');
   * params.append('foo', 'baz');
   * params.append('abc', 'def');
   * console.log(params.toString());
   * // Prints foo=bar&#x26;foo=baz&#x26;abc=def
   *
   * params.set('foo', 'def');
   * params.set('xyz', 'opq');
   * console.log(params.toString());
   * // Prints foo=def&#x26;abc=def&#x26;xyz=opq
   * ```
   */
  set(name: string, value: string): void {
    this.params.set(name, [value ?? ""]);
  }

  /**
   * Sort all existing name-value pairs in-place by their names. Sorting is done
   * with a [stable sorting algorithm](https://en.wikipedia.org/wiki/Sorting_algorithm#Stability), so relative order between name-value pairs
   * with the same name is preserved.
   *
   * This method can be used, in particular, to increase cache hits.
   *
   * ```js
   * const params = new URLSearchParams('query[]=abc&#x26;type=search&#x26;query[]=123');
   * params.sort();
   * console.log(params.toString());
   * // Prints query%5B%5D=abc&#x26;query%5B%5D=123&#x26;type=search
   * ```
   * @since v7.7.0, v6.13.0
   */
  sort(): void {
    this.params = new Map(
      Array.from(this.params.entries()).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  /**
   * Returns the search parameters serialized as a string, with characters
   * percent-encoded where necessary.
   */
  toString(): string {
    const query: string[] = [];

    for (const key in this.params) {
      const name = encode(key);
      const value = this.params.get(key)!;

      for (let i = 0; i < value.length; i++) {
        query.push(`${name}=${encode(value[i])}`);
      }
    }

    return query.join("&");
  }

  /**
   * Returns an ES6 `Iterator` over the values of each name-value pair.
   */
  values(): IterableIterator<string> {
    const items = new Set<string>();

    this.forEach((item) => {
      items.add(item);
    });

    return items.values();
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }
}
