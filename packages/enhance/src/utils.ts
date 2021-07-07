/**
 * 包装函数，先执行 wrapper ，然后执行原函数
 *
 * @param original 原函数
 * @param pre 预执行函数
 *
 * @returns 包装函数
 *
 * E.g.:
 *
 * ```ts
 * const a = () => console.log('a');
 * const b = () => console.log('b');
 * const c = wrapFunction(a, b);
 *
 * c(); // expect to output 'a', and then output 'b'
 * ```
 */
export function wrapFunction<T>(
  original: ((this: T, ...args: any[]) => void) | undefined,
  pre: (this: T, ...args: any[]) => void
): (this: T, ...args: any[]) => void;
export function wrapFunction<T>(
  original: ((this: T, ...args: any[]) => Promise<void>) | undefined,
  pre: (this: T, ...args: any[]) => void
): (this: T, ...args: any[]) => Promise<void>;

export function wrapFunction<T, R extends void | Promise<void>>(
  original: ((this: T, ...args: any[]) => R) | undefined,
  pre: (this: T, ...args: any[]) => void
) {
  return function wrapper(this: T, ...args: any[]): Promise<void> | void {
    pre.apply(this, args);

    if (original) return original.apply(this, args);
  };
}
