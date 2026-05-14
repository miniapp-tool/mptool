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
});
