import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { updateApp } from "../src/index.js";

describe(updateApp, () => {
  it("should not throw when registering update callbacks", () => {
    expect(() =>
      updateApp(() => {
        // noop
      }),
    ).not.toThrow();
  });
});
