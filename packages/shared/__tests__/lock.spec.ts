import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { lock } from "../src";

describe(lock, () => {
  it("run once", () =>
    new Promise<void>((resolve) => {
      let count = 0;

      const fn = lock((release) => {
        count += 1;
        setTimeout(() => {
          expect(count).toBe(1);
          release();
          resolve();
        }, 10);
      });

      fn();
      fn();
    }));

  it("reuse", () =>
    new Promise<void>((resolve) => {
      const fn = lock((release, callbackFunc?: () => unknown) => {
        setTimeout(() => {
          release();
          // oxlint-disable-next-line vitest/no-conditional-in-test
          if (callbackFunc) callbackFunc();
        }, 10);
      });

      fn();
      fn(() => {
        expect(false).toBe("The function should be locked");
      });
      setTimeout(() => {
        fn(() => {
          resolve();
        });
      }, 10);
    }));

  it("should release the lock when the function throws synchronously", () => {
    let calls = 0;

    const fn = lock(() => {
      calls += 1;
      throw new Error("sync error");
    });

    expect(() => fn()).toThrow("sync error");
    // the lock is released, so the second call runs the function again
    expect(() => fn()).toThrow("sync error");
    expect(calls).toBe(2);
  });
});
