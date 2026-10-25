import { describe, expect, it } from "vitest";

import { ParseError } from "../src/parser.js";
import { run, runBoth } from "./golden.js";

describe("automatic semicolon insertion (restricted productions)", () => {
  it("should terminate return at a line break", () => {
    runBoth("function f(){ return\n42 } f()");
    runBoth("function f(){ return\n} f()");
    runBoth("function f(){ return 42\n} f()");
  });

  it("should reject a line break after throw", () => {
    expect(() => {
      (0, eval)("throw\n1");
    }).toThrow(SyntaxError);
    expect(() => run("throw\n1")).toThrow(ParseError);
  });

  it("should not treat ++/-- on the next line as postfix", () => {
    runBoth("let a=1,b=2; a\n++b; [a,b]");
    runBoth("let a=1,b=2; a\n--b; [a,b]");
  });

  it("should not consume a label after a line break", () => {
    // `break` and `outer;` are two statements, so the loop exits and the expression is a no-op
    // `break` 与 `outer;` 是两条语句，循环退出，表达式语句无副作用
    runBoth("let outer = 1; function f(){ for(;;){ break\nouter; } return 1 } f()");
    runBoth("let outer = 1; let n = 0; while(n < 3){ n++\ncontinue\nouter; } n");
  });

  it("should treat async on its own line as an identifier", () => {
    expect(() => run("async\nx => x")).toThrow(ReferenceError);
    expect(() => run("async\nfunction f(){}")).toThrow(ReferenceError);
    expect(() => run("async\nfunction f(){}; typeof f")).toThrow(ReferenceError);
  });

  it("should keep same-line async arrows and functions working", () => {
    runBoth("(async (x) => x)(1)");
    runBoth("(async x => x)(2)");
    runBoth("async function f(){ return 3 } f()");
  });
});
