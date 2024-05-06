import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { funcQueue } from "../src";

describe("queue", () => {
  it("Run by sequence", () =>
    new Promise<void>((resolve) => {
      const result: number[] = [];
      const fn = funcQueue((next, num: number, timer: number) => {
        setTimeout(() => {
          result.push(num);
          next();
        }, timer);
      });

      fn(1, 60);
      fn(2, 40);
      fn(3, 20);

      setTimeout(() => {
        expect(result).toEqual([1, 2, 3]);
        resolve();
      }, 200);
    }));

  it("Parall 3 task", () =>
    new Promise<void>((resolve) => {
      let count = 0;
      const fn = funcQueue((next, timer: number) => {
        setTimeout(() => {
          count += 1;
          next();
        }, timer);
      }, 3);

      fn(50);
      fn(50);
      fn(50);
      fn(50);
      fn(100);
      setTimeout(() => {
        expect(count).toEqual(3);
      }, 60);
      setTimeout(() => {
        expect(count).toEqual(4);
      }, 120);
      setTimeout(() => {
        expect(count).toEqual(5);
        resolve();
      }, 170);
    }));
});
