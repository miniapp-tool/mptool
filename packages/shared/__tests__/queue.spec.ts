import { describe, expect, it, vi } from "vitest";

import { Queue, funcQueue } from "../src";

describe(funcQueue, () => {
  it("run by sequence", () =>
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
        expect(result).toStrictEqual([1, 2, 3]);
        resolve();
      }, 200);
    }));

  it("parallel 3 task", () =>
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
        expect(count).toBe(3);
      }, 60);
      setTimeout(() => {
        expect(count).toBe(4);
      }, 120);
      setTimeout(() => {
        expect(count).toBe(5);
        resolve();
      }, 170);
    }));

  it("should clear pending tasks", () =>
    new Promise<void>((resolve) => {
      const queue = new Queue();
      const fn = vi.fn<() => void>();

      queue.add((next) => {
        setTimeout(() => {
          next();
        }, 10);
      });
      queue.add(fn);
      queue.clear();

      setTimeout(() => {
        expect(fn).not.toHaveBeenCalled();
        resolve();
      }, 50);
    }));

  it("should release a task only once when next() is called repeatedly", () =>
    new Promise<void>((resolve) => {
      const queue = new Queue();
      const results: number[] = [];

      queue.add((next) => {
        results.push(1);
        next();
        next();
      });
      queue.add((next) => {
        results.push(2);
        next();
      });

      setTimeout(() => {
        expect(results).toStrictEqual([1, 2]);
        expect(queue.running).toBe(0);
        resolve();
      }, 20);
    }));

  it("should release a task only once when it throws after next()", () =>
    new Promise<void>((resolve) => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const queue = new Queue();
      const results: string[] = [];

      queue.add((next) => {
        results.push("first");
        next();
        throw new Error("sync error");
      });
      queue.add((next) => {
        results.push("second");
        next();
      });

      setTimeout(() => {
        expect(results).toStrictEqual(["first", "second"]);
        expect(queue.running).toBe(0);
        spy.mockRestore();
        resolve();
      }, 20);
    }));

  it("should continue the queue when a task throws synchronously", () =>
    new Promise<void>((resolve) => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const queue = new Queue();
      const results: string[] = [];

      queue.add(() => {
        throw new Error("sync error");
      });
      queue.add((next) => {
        results.push("second");
        next();
      });

      setTimeout(() => {
        expect(results).toStrictEqual(["second"]);
        spy.mockRestore();
        resolve();
      }, 20);
    }));
});
