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

/**
 * 锁定某个函数使其无法被再次执行直到函数自己解锁
 *
 * @param fn 需要锁定的函数, 形式为 `(release: () => void, ...args: A) => R`
 * @param ctx 可选的上下文环境
 *
 * @returns 封装函数，形式为 `(...args: A) => R`
 *
 * ```ts
 * let count = 0;
 * const func = (release: () => void) => {
 *   count += 1;
 *   setTimeout(() => {
 *     release();
 *   }, 10)
 * };
 *
 * const fn = tool.lock(func);
 *
 * fn(); // count is 1
 * fn(); // count is still 1 because it's not released
 * setTimeout(() => {
 *   fn(); // count is 2 because it's released
 *   fn(); // count is still 2 because it's locked again
 * }, 15);
 * ```
 */
export const lock = <T, A extends unknown[], R>(
  fn: (this: T, release: () => void, ...args: A) => R,
  ctx?: T
): ((this: T, ...args: A) => R | undefined) => {
  let pending: boolean;

  return function lockFun(this: T, ...args: A): R | undefined {
    if (pending) return undefined;

    pending = true;

    // eslint-disable-next-line no-invalid-this
    return fn.apply(ctx || this, [
      (): void => {
        pending = false;
      },
      ...args,
    ]);
  };
};

/**
 * 包装函数保证其之被调用一次
 *
 * @param func 调用的函数
 * @param ctx 可选的上下文环境
 *
 * @returns 包装过的函数
 *
 * E.g.:
 *
 * ```ts
 * let count = 0;
 * const counter = once(() => count++ );
 * counter(); // count is 1
 * counter(); // count is still 1
 * ```
 */
export const once = <T, A extends unknown[], R>(
  func: (...args: A) => R,
  ctx?: T
): ((this: T, ...args: A) => R | undefined) => {
  let called: boolean;

  return function onceFunc(this: T, ...args: A): R | undefined {
    if (called || !func) return undefined;
    called = true;

    return func.apply(ctx || null, args);
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Task<ArgType extends unknown[] = unknown[], This = unknown> {
  /** 函数本身 */
  func: (this: This, next: () => void, ...args: ArgType) => void;
  /** 函数的运行上下文 */
  ctx: This;
  /** 函数的参数 */
  args: ArgType;
}

/**
 * 一个队列，在上一个函数执行完毕后执行 `next()`  才会开始执行下一个函数。
 */
export class Queue {
  constructor(
    /** 允许同时并行的任务数 */
    public capacity = 1
  ) {}

  /** 回调队列 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public funcQueue: Task<any, any>[] = [];

  /** 正在运行的数量 */
  public running = 0;

  /** 执行下一个函数 */
  next(): void {
    /** 即将执行的任务 */
    const task = this.funcQueue.shift();

    if (task) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { func, ctx, args } = task;

      const taskFunc = (): void => {
        func.apply(ctx, [
          (): void => {
            this.running -= 1;
            this.next();
          },
          ...[].slice.call(args, 0),
        ]);
      };

      this.running += 1;
      taskFunc();
    }
  }

  /**
   * 添加函数
   * @param func 函数
   * @param ctx 函数运行上下文
   * @param args 函数参数
   */
  add<A extends unknown[], T>(
    func: (next: () => void, ...args: A) => void,
    ctx?: T,
    ...args: A
  ): void {
    this.funcQueue.push({
      func,
      ctx,
      args: [].slice.call(args, 0),
    });

    // 开始第一个队列
    if (this.running < this.capacity) this.next();
  }

  /** 清除队列，不再执行尚未执行的函数 */
  clear(): void {
    this.funcQueue = [];
  }
}

/**
 * 在调用函数的时候启用队列，在上一个函数执行完毕后执行 `next()`  才会开始执行下一个函数。
 *
 * @param fn 处理的函数
 * @param capacity 允许同时并行的任务数
 *
 * @returns 包装过的函数
 * @async
 */
export const funcQueue = <A extends unknown[], T = unknown>(
  fn: (next: () => void, ...args: A) => void,
  capacity = 1
): ((this: T, ...args: A) => void) => {
  const queue = new Queue(capacity);

  return function queueFunc(this: T, ...args: A): void {
    // eslint-disable-next-line no-invalid-this
    queue.add(fn, this, ...args);
  };
};
