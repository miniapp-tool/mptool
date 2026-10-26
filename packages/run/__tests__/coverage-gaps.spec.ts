import { describe, expect, it } from "vitest";

import { expectError, run, runBoth } from "./golden.js";

describe("statement edge coverage", () => {
  it("should reject iterating an undefined iterable", () => {
    expectError("for (const x of undefined) {}");
  });

  it("should evaluate if statements without an alternate", () => {
    runBoth("if (false) 1; 2");
    runBoth("if (true) 1; 2");
  });

  it("should resolve nested labels and labeled non-loop statements", () => {
    runBoth("a: b: while (false) { break a; } 1");
    runBoth("foo: { break foo; } 1");
    runBoth("outer: do { break outer; } while (true); 1");
    runBoth("outer: do { continue outer; } while (false); 1");
  });

  it("should detect var declarations in an if alternate when checking lexical conflicts", () => {
    // `let` + `var` for the same name in one block is a syntax error; the scan must walk `else`
    // 同一块中的 `let` 与 `var` 同名属于语法错误；扫描必须进入 `else` 分支
    expect(() => run("let a; if (0) {} else { var a; }")).toThrow(SyntaxError);
  });
});

describe("object literal edge coverage", () => {
  it("should support getter/setter pairs and symbol-named function values", () => {
    runBoth("const o = { get x() { return 1; }, set x(v) { this._x = v; } }; o.x = 2; o.x");
    runBoth("typeof ({ [Symbol.iterator]: function() {} })[Symbol.iterator]");
  });
});

describe("class and super edge coverage", () => {
  it("should support computed super access and assignment", () => {
    runBoth(
      "class A { m() { return 1; } } class B extends A { m() { return super['m'](); } } new B().m()",
    );
    runBoth(
      "class A { set x(v) { this._x = v; } get x() { return this._x; } } class B extends A { m() { super['x'] = 5; return this.x; } } new B().m()",
    );
  });

  it("should support a parent constructor that returns a function", () => {
    runBoth(
      "class A { constructor() { return function () {}; } } class B extends A {}; typeof new B()",
    );
  });

  it("should accept a parent constructor with a null prototype property", () => {
    runBoth(
      "const F = function () {}; F.prototype = null; class A extends F {}; new A() instanceof A",
    );
  });

  it("should enforce maxStack while running super()", () => {
    expect(() =>
      run("class A {} class B extends A { constructor() { super(); } } new B()", { maxStack: 1 }),
    ).toThrow(Error);
  });
});

describe("destructuring and delete edge coverage", () => {
  it("should reject destructuring undefined", () => {
    expectError("const [a] = undefined");
    expectError("const { a } = undefined");
  });

  it("should delete computed properties on nested members", () => {
    runBoth("const o = { a: { b: 1 } }; delete o.a['b']; o.a.b");
    runBoth("const o = { a: 1 }; delete o['a']; 'a' in o");
  });

  it("should collect object rest bindings from function parameters", () => {
    runBoth("function f({ a, ...rest }) { return rest.b; } f({ a: 1, b: 2 })");
  });
});

describe("additional branch coverage", () => {
  it("should take both if branches with and without an alternate", () => {
    runBoth("if (false) 1; else 2");
    runBoth("if (true) 1; else 2");
  });

  it("should resolve continue through nested labels", () => {
    runBoth("a: b: while (false) { continue a; } 1");
    runBoth("a: b: for (;;) { break a; } 1");
  });

  it("should compound-assign computed super properties", () => {
    runBoth(
      "class A { constructor() { this._x = 1; } get x() { return this._x; } set x(v) { this._x = v; } } class B extends A { m() { super['x'] += 2; return this.x; } } new B().m()",
    );
  });

  it("should delete a non-computed member of a computed member", () => {
    runBoth("const o = { a: { b: 1 } }; delete o['a'].b; o.a.b");
  });

  it("should spread a function value in an object literal", () => {
    runBoth("Object.keys({ ...Math.max })");
  });

  it("should carry an optional chain on the result of super()", () => {
    runBoth("class A {} class B extends A { constructor() { super()?.x; } } new B(); 1");
  });

  it("should short-circuit a chain used as a call callee", () => {
    runBoth("const o = null; o?.a.b()");
  });

  it("should use strict this handling for named function expressions", () => {
    expect(run("(function f() { return typeof this; })()", { strict: true })).toBe("undefined");
  });

  it("should report an unnamed class constructor invoked without new", () => {
    expectError("(class {})()");
  });

  it("should name an anonymous class constructor from its key", () => {
    runBoth("new (class { constructor() { this.x = 1; } })().x");
  });

  it("should support symbol-named class methods", () => {
    runBoth("class A { [Symbol.iterator]() { return 1; } } typeof A.prototype[Symbol.iterator]");
  });
});

describe("super optional chain coverage", () => {
  it("should evaluate optional reads and calls rooted at super", () => {
    runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { m() { return super.m?.x; } } new B().m()",
    );
    runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { m() { return super.m?.(); } } new B().m()",
    );
    runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { m() { return super['m']?.(); } } new B().m()",
    );
  });
});

describe("computed super and chain coverage", () => {
  it("should read computed super members through evalMember", () => {
    runBoth(
      "class A { m() { return 1; } } class B extends A { m() { return typeof super['m']; } } new B().m()",
    );
  });

  it("should use computed keys on super chain links", () => {
    runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { m() { return super['m']?.x; } } new B().m()",
    );
  });

  it("should use computed keys on ordinary chain links", () => {
    runBoth("const o = { a: { b: 1 } }; o?.a['b']");
  });

  it("should use computed callee keys on optional calls", () => {
    runBoth("const o = { m: () => 1 }; o['m']?.()");
  });

  it("should throw for optional super calls with a null super base", () => {
    expect(() =>
      run("class A extends null { m() { return super.m?.(); } } Object.create(A.prototype).m()"),
    ).toThrow(ReferenceError);
  });
});

describe("constructor prototype fallbacks", () => {
  it("should fall back to Object.prototype when a function prototype is null", () => {
    runBoth("function F() { this.x = 1; } F.prototype = null; new F().x");
  });
});

describe("spread and inheritance edge coverage", () => {
  it("should ignore primitive and null object spread sources", () => {
    runBoth("Object.keys({ ...1 })");
    runBoth("Object.keys({ ...null })");
    runBoth("Object.keys({ ...true, a: 1 })");
  });

  it("should run super() through multiple explicit derived constructors", () => {
    runBoth(
      "class A { constructor() { this.a = 1; } } class B extends A { constructor() { super(); this.b = 2; } } class C extends B { constructor() { super(); this.c = 3; } } const c = new C(); [c.a, c.b, c.c]",
    );
  });

  it("should collect elided array pattern parameters", () => {
    runBoth("function f([, a]) { return a; } f([1, 2])");
  });
});
