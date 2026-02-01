import { expectTypeOf, it } from "vitest";

import { readFile } from "../src/index.js";

it("$readFile", () => {
  const test1 = readFile("test1");
  const test2 = readFile("test1", "binary");
  const test3 = readFile("test1", "utf8");

  expectTypeOf(test1).toEqualTypeOf<string | undefined>();
  expectTypeOf(test2).toEqualTypeOf<ArrayBuffer | undefined>();
  expectTypeOf(test3).toEqualTypeOf<string | undefined>();
});
