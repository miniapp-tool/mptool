import { describe, expect, it } from "vitest";

import { createFunction } from "../src/index.js";
import { getInterpreterMeta } from "../src/value.js";

/**
 * Wait for the host event loop for roughly `ms` milliseconds.
 *
 * 在宿主事件循环上等待约 `ms` 毫秒。
 *
 * @param ms - Milliseconds to wait / 等待毫秒数
 * @returns A promise resolved after the delay / 延迟后兑现的 Promise
 */
const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Busy-wait synchronously for roughly `ms` milliseconds.
 *
 * 同步忙等约 `ms` 毫秒。
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

describe("createFunction budget", () => {
  it("should still run after waiting longer than maxDuration", async () => {
    const fn = createFunction([], "return 1;", { maxDuration: 20 });

    await delay(60);

    expect(fn()).toBe(1);
  });

  it("should still run an async body after waiting longer than maxDuration", async () => {
    const fn = createFunction(
      [],
      "return (async function () { await Promise.resolve(); return 1; })();",
      { maxDuration: 20 },
    );

    await delay(60);

    await expect(fn()).resolves.toBe(1);
  });

  it("should not accumulate stepCount across host calls", () => {
    const fn = createFunction(
      [],
      "let total = 0; for (let i = 0; i < 200; i += 1) total += i; return total;",
      { maxSteps: 2000 },
    );

    for (let i = 0; i < 5; i += 1) expect(fn()).toBe(19_900);
  });

  it("should not accumulate stepCount across async host calls", async () => {
    const fn = createFunction(
      [],
      [
        "return (async function () {",
        "  await 0;",
        "  let total = 0;",
        "  for (let i = 0; i < 100; i += 1) total += i;",
        "  return total;",
        "})();",
      ].join("\n"),
      { maxSteps: 2000 },
    );

    // calls must stay sequential: each call must observe the previous call's settled state
    // 调用必须串行：每次调用都要看到上一次调用结算后的状态
    // oxlint-disable-next-line no-await-in-loop -- sequential calls are the scenario under test
    for (let i = 0; i < 5; i += 1) await expect(fn()).resolves.toBe(4950);
  });

  it("should not refresh the budget for nested invocations", () => {
    const fn = createFunction(
      [],
      [
        "function wait() { return busy(); }",
        "function nested() { return wait() + wait(); }",
        "return nested();",
      ].join("\n"),
      { maxDuration: 50, globals: { busy: () => busyWait(30) } },
    );

    // the two 30 ms host calls exceed the 50 ms budget; nested calls must not extend it
    // 两次 30ms 宿主调用超过 50ms 预算；嵌套调用不得延长该预算
    expect(() => fn()).toThrow(/time limit/u);
  });
});

describe("createFunction metadata and construction", () => {
  it("should accept a body ending with a line comment", () => {
    expect(createFunction([], "return 1; // trailing comment")()).toBe(1);
    expect(createFunction([], "return 2; //")()).toBe(2);
    expect(createFunction(["a"], "return a; // trailing comment")(5)).toBe(5);
  });

  it("should keep the source function length", () => {
    expect(createFunction(["a", "b"], "return a + b;")).toHaveLength(2);
    expect(createFunction(["a", "b = 1"], "return a;")).toHaveLength(1);
    expect(createFunction([], "return 1;")).toHaveLength(0);
  });

  it("should keep the source function name", () => {
    // the parsed source is an anonymous function expression, so its name is empty
    // 解析出的源是匿名函数表达式，因此其 name 为空
    expect(createFunction([], "return 1;").name).toBe("");
  });

  it("should be constructable with new", () => {
    const fn = createFunction([], "this.value = 42;");
    const Ctor = fn as unknown as new () => { value: number };
    const instance = new Ctor();

    expect(instance.value).toBe(42);
  });

  it("should expose the interpreter metadata", () => {
    expect(getInterpreterMeta(createFunction([], "return 1;"))).not.toBeNull();
  });

  it("should validate the parameter list", () => {
    expect(() => createFunction(["a", "1"], "return a;")).toThrow(SyntaxError);
  });
});
