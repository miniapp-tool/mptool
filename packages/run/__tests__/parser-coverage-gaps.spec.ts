import { describe, expect, it } from "vitest";

import { getFunctionSource, parse } from "../src/parser.js";

describe(getFunctionSource, () => {
  it("should return the recorded source of parsed functions", () => {
    const program = parse("function f() { return 1; }");

    expect(getFunctionSource(program.body[0])).toContain("function f");
  });

  it("should return null for nodes without recorded source", () => {
    expect(getFunctionSource({})).toBeNull();
  });
});
