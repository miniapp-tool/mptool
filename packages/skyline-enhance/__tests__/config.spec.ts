import "@mptool/mock";
import { MpError } from "@mptool/shared";
import { describe, expect, it } from "vitest";

import { $Component } from "../src/component/index.js";
import { getConfig } from "../src/config/index.js";

describe("$Config", () => {
  it("should throw an MpError when a component is registered without $Config", () => {
    let error: unknown;

    try {
      $Component({});
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(MpError);
    expect((error as Error).name).toBe("MpError");
    expect((error as Error).message).toContain("$Config");
    expect(error).toMatchObject({ code: null });
    expect(() => getConfig()).toThrow(MpError);
  });
});
