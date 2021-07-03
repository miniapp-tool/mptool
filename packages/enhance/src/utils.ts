/**
 * 包装函数，先尝试执行 before ，然后执行 after
 *
 * @param before 先调用的函数
 * @param after 调用的函数
 *
 * @returns 返回复合函数
 *
 * E.g.:
 *
 * ```ts
 * const a = () => console.log('a');
 * const b = () => console.log('b');
 * const c = mergeFun(a, b);
 *
 * c(); // expect to output 'a', and then output 'b'
 * ```
 */
export const mergeFunction = function mergeFun<T>(
  before: ((this: T, ...args: any[]) => Promise<void> | void) | undefined,
  after: ((this: T, ...args: any[]) => Promise<void> | void) | undefined
) {
  return async function merge(this: T, ...args: any[]): Promise<void> {
    try {
      // eslint-disable-next-line no-invalid-this
      if (before) await before.apply(this, args);
    } finally {
      // eslint-disable-next-line no-invalid-this
      if (after) await after.apply(this, args);
    }
  };
};
