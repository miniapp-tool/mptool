import { describe, it } from "vitest";

import { runBoth } from "./golden.js";

describe("quoted property names", () => {
  it("should use the unquoted name for object literals", () => {
    runBoth("({'a': 1}).a");
    runBoth("({'a-b': 2})['a-b']");
    runBoth("({'1': 3})[1]");
    runBoth("const o = {'a': 1, b: 2}; [o.a, o.b]");
  });

  it("should use the unquoted name for getters, setters and methods", () => {
    runBoth("({get 'a'(){ return 1 }}).a");
    runBoth("({set 'a'(v){ this._a = v }, get 'a'(){ return this._a }}).a");
    runBoth("({async 'm'(){ return 1 }}).m()");
    runBoth("({'m': function () { return 1 }}).m()");
  });

  it("should use the unquoted name in class methods", () => {
    runBoth("class A { 'm'() { return 1 } } new A().m()");
    runBoth("class A { 'constructor'() { this.x = 2 } } new A().x");
    runBoth("class A { static 's'() { return 3 } } A.s()");
  });

  it("should use the unquoted name in destructuring patterns", () => {
    runBoth("const {'a': x} = {a: 1}; x");
    runBoth("const {['a']: x} = {a: 2}; x");
  });
});
