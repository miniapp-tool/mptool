import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { lock } from "../src";

describe("lock", () => {
  it("run once", () =>
    new Promise<void>((resolve) => {
      let count = 0;

      const fn = lock((release) => {
        count += 1;
        setTimeout(() => {
          expect(count).toEqual(1);
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
          if (callbackFunc) callbackFunc();
        }, 10);
      });

      fn();
      fn(() => {
        expect(false).toEqual("The function should be locked");
      });
      setTimeout(() => {
        fn(() => {
          resolve();
        });
      }, 10);
    }));
});
