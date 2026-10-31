import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { once } from "../src";

describe(once, () => {
  it("run once", () =>
    new Promise<void>((resolve) => {
      let count = 0;
      const fn = once((num: number) => {
        count += 1;
        setTimeout(() => {
          expect(count).toBe(1);
          expect(num).toBe(1);
          resolve();
        }, 20);
      });

      fn(1);
      fn(2);
      fn(3);

      setTimeout(() => {
        expect(count).toBe(1);
      }, 10);
    }));

  it("keeps this when called as an object method", () => {
    const obj = {
      value: 42,
      getValue: once(function getValue(this: { value: number }) {
        return this.value;
      }),
    };

    expect(obj.getValue()).toBe(42);
  });

  it("prefers the explicit context over the call-site this", () => {
    const ctx = { value: 7 };
    const fn = once(function fn(this: { value: number }) {
      return this.value;
    }, ctx);

    expect(fn.call({ value: 1 })).toBe(7);
  });

  it("run once with multiple args", () =>
    new Promise<void>((resolve) => {
      let count = 0;
      const fn = once((x: number, y: number) => {
        count += x + y;
        setTimeout(() => {
          expect(x).toBe(1);
          expect(y).toBe(2);
          expect(count).toBe(3);
          resolve();
        }, 20);
      });

      fn(1, 2);
      fn(3, 4);
      fn(5, 6);

      setTimeout(() => {
        expect(count).toBe(3);
      }, 10);
    }));
});
