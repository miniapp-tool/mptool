import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { logger, query } from "../src/index.js";

describe("exported namespaces", () => {
  it("should freeze the logger namespace", () => {
    expect(Object.isFrozen(logger)).toBe(true);
    expect(logger.debug).toBeTypeOf("function");

    expect(() => {
      (logger as { debug: unknown }).debug = (): void => void 0;
    }).toThrow(TypeError);
  });

  it("should freeze the query namespace", () => {
    expect(Object.isFrozen(query)).toBe(true);
    expect(query.parse).toBeTypeOf("function");

    expect(() => {
      (query as { parse: unknown }).parse = (): unknown => ({});
    }).toThrow(TypeError);
  });
});
