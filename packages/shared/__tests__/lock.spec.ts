import "@mptool/mock";
import { describe, expect, it } from "vitest";
import { lock } from "../src";

describe("lock", () => {
  it("run once", () =>
    new Promise((resolve) => {
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
    new Promise((resolve) => {
      const fn = lock((release, callbackFunc?: any) => {
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
