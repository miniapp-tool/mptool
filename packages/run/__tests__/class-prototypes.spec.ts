import { describe, it } from "vitest";

import { expectError, runBoth } from "./golden.js";

describe("class prototype semantics", () => {
  it("should link base class instances to Object.prototype", () => {
    runBoth("class A {}; String(new A())");
    runBoth("class A {}; new A() instanceof Object");
    runBoth("class A { constructor() { this.x = 1; } }; new A().hasOwnProperty('x')");
    runBoth("class A {}; Object.getPrototypeOf(A.prototype) === Object.prototype");
  });

  it("should keep extends null prototypes null and reject construction", () => {
    runBoth("class A extends null {}; Object.getPrototypeOf(A.prototype) === null");
    // a derived constructor of `extends null` cannot call `super()`; `new A()` must throw
    // `extends null` 的派生构造器不能调用 `super()`；`new A()` 必须抛错
    expectError("class A extends null {}; new A()");
    expectError("class A extends null { constructor() { super(); } }; new A()");
    // an explicit constructor may return an object without calling super()
    // 显式构造器可以不调用 super() 直接返回对象
    runBoth("class A extends null { constructor() { return { a: 1 }; } }; new A().a");
  });
});
