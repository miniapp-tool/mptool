import { describe, expect, it } from "vitest";

import { run } from "./golden.js";

/**
 * Host iterable whose iterator records whether it was closed.
 *
 * 记录是否被关闭的宿主可迭代对象。
 *
 * @param state - Shared state object / 共享状态对象
 * @returns The iterable / 可迭代对象
 */
const makeIterable = (state: { closed: boolean }): Iterable<number> => ({
  [Symbol.iterator](): Iterator<number> {
    let index = 0;

    return {
      next(): IteratorResult<number> {
        if (index >= 3) return { done: true, value: undefined };

        const value = index;

        index += 1;

        return { done: false, value };
      },
      return(): IteratorResult<number> {
        state.closed = true;

        return { done: true, value: undefined };
      },
    };
  },
});

describe("for-of IteratorClose", () => {
  it("should close the iterator on break", () => {
    const state = { closed: false };

    run("for (const x of it) { break; }", { globals: { it: makeIterable(state) } });

    expect(state.closed).toBe(true);
  });

  it("should close the iterator on throw and return", () => {
    const throwState = { closed: false };

    run("try { for (const x of it) { throw new Error('boom'); } } catch (e) {}", {
      globals: { it: makeIterable(throwState) },
    });

    expect(throwState.closed).toBe(true);

    const returnState = { closed: false };

    run("(function () { for (const x of it) { return 1; } })()", {
      globals: { it: makeIterable(returnState) },
    });

    expect(returnState.closed).toBe(true);
  });

  it("should not close the iterator on normal completion or continue", () => {
    const normalState = { closed: false };

    run("for (const x of it) {}", { globals: { it: makeIterable(normalState) } });

    expect(normalState.closed).toBe(false);

    const continueState = { closed: false };

    run("for (const x of it) { continue; }", { globals: { it: makeIterable(continueState) } });

    expect(continueState.closed).toBe(false);
  });

  it("should ignore errors thrown by the closing method", () => {
    const throwingIterable: Iterable<number> = {
      [Symbol.iterator](): Iterator<number> {
        return {
          next: () => ({ done: false, value: 1 }),
          return: () => {
            throw new Error("close failed");
          },
        };
      },
    };

    run("for (const x of it) { break; } 1", { globals: { it: throwingIterable } });
  });

  it("should close the iterator in async loops", async () => {
    const state = { closed: false };

    await run("(async () => { for (const x of it) { await 0; break; } })()", {
      globals: { it: makeIterable(state) },
    });

    expect(state.closed).toBe(true);
  });
});
