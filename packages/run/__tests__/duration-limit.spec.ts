import { describe, expect, it } from "vitest";

import { createSandbox, run, runSync } from "../src/index.js";

/**
 * Busy-wait on the host for roughly `ms` milliseconds.
 *
 * 在宿主侧忙等约 `ms` 毫秒。
 *
 * @param ms - Milliseconds to block / 阻塞毫秒数
 * @returns A constant / 常量
 */
const busyWait = (ms: number): number => {
  const end = Date.now() + ms;

  while (Date.now() < end) {
    // busy wait
  }

  return 1;
};

describe("maxDuration wall-clock budget", () => {
  it("should abort a long synchronous loop", () => {
    expect(() => run("while (true) {}", { maxDuration: 20 })).toThrow(/time limit/u);
    expect(() => runSync("while (true) {}", { maxDuration: 20 })).toThrow(/time limit/u);
  });

  it("should abort after a slow host call returns", () => {
    expect(() => run("busy()", { maxDuration: 20, globals: { busy: () => busyWait(80) } })).toThrow(
      /time limit/u,
    );
  });

  it("should abort a long async loop", async () => {
    await expect(
      run("async function f() { while (true) {} } f()", { maxDuration: 20 }),
    ).rejects.toThrow(/time limit/u);
    await expect(
      run("async function f() { busy(); return 1 } f()", {
        maxDuration: 20,
        globals: { busy: () => busyWait(80) },
      }),
    ).rejects.toThrow(/time limit/u);
  });

  it("should not kill normal code", () => {
    expect(run("1 + 1", { maxDuration: 5000 })).toBe(2);
    expect(run("let i = 0; while (i < 100000) i += 1; i", { maxDuration: 5000 })).toBe(100_000);
    expect(run("2 + 2", { maxDuration: Number.POSITIVE_INFINITY })).toBe(4);
  });

  it("should not kill normal async code", async () => {
    await expect(
      run("(async () => { await 1; return 3; })()", { maxDuration: 5000 }),
    ).resolves.toBe(3);
  });

  it("should reset the deadline for every sandbox run", () => {
    const sandbox = createSandbox({ maxDuration: 100, globals: { busy: () => busyWait(80) } });

    // each run gets a fresh deadline: two 80ms runs must both fit a 100ms budget
    // 每次 run 都重新计时：两次 80ms 的运行都能放进 100ms 预算
    expect(sandbox.run("busy()")).toBe(1);
    expect(sandbox.run("busy()")).toBe(1);
  });
});
