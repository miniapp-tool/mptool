import { describe, expect, it } from "vitest";

import { MpError } from "../src/index.js";

describe(MpError, () => {
  it("should be an instance of Error", () => {
    const error = new MpError({ code: 404, message: "not found" });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MpError);
  });

  it("should set code and message", () => {
    const error = new MpError({ code: 500, message: "server error" });

    expect(error.code).toBe(500);
    expect(error.message).toBe("server error");
    expect(error.name).toBe("MpError");
  });

  it("should default code to null", () => {
    const error = new MpError({ message: "no code" });

    expect(error.code).toBeNull();
  });

  it("should handle empty options", () => {
    const error = new MpError({});

    expect(error.code).toBeNull();
    expect(error.message).toBe("");
  });

  it("should format toString with code and message", () => {
    const error = new MpError({ code: 403, message: "forbidden" });

    expect(error.toString()).toBe("code: 403, message: forbidden");
  });
});
