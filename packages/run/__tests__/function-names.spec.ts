import { describe, it } from "vitest";

import { runBoth } from "./golden.js";

describe("function names and method source", () => {
  it("should infer names for anonymous functions assigned to identifiers", () => {
    runBoth("(function () { const f = function () {}; return f.name; })()");
    runBoth("(function () { let g; g = () => {}; return g.name; })()");
    runBoth("(function () { var h = function () {}; return h.name; })()");
    runBoth("(function () { const { a = function () {} } = {}; return a.name; })()");
  });

  it("should infer names for object literal properties", () => {
    runBoth("(function () { const o = { m: function () {} }; return o.m.name; })()");
    runBoth("(function () { const o = { m() {} }; return o.m.name; })()");
    runBoth("(function () { const o = { ['m']: function () {} }; return o.m.name; })()");
  });

  it("should not rename explicitly named functions", () => {
    runBoth("(function () { const f = function named() {}; return f.name; })()");
    runBoth("(function () { function g() {} return g.name; })()");
  });

  it("should not infer names from member assignment targets", () => {
    runBoth("(function () { const o = {}; o.m = function () {}; return o.m.name; })()");
  });

  it("should expose class method source through toString", () => {
    runBoth("(function () { class A { m() {} } return A.prototype.m.toString(); })()");
    runBoth("(function () { class A { async m() {} } return String(A.prototype.m); })()");
    runBoth("(function () { class A { static m() {} } return A.m.toString(); })()");
  });
});
