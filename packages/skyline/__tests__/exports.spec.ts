import { mockWx } from "@mptool/mock";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as shared from "@mptool/shared";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as skyline from "@mptool/skyline";
import { describe, expect, it } from "vitest";

describe("@mptool/skyline shared exports", () => {
  it("re-exports every public value of @mptool/shared", () => {
    // `Emitter` is intentionally excluded: enhance / skyline-enhance already export it, so a
    // second re-export would trigger TS2308. Deriving the expected names from the shared package
    // itself keeps this check honest when shared gains another public value.
    const expectedNames = Object.keys(shared).filter((name) => name !== "Emitter");

    expect(expectedNames.filter((name) => !(name in skyline))).toStrictEqual([]);
  });

  it("keeps the re-exported namespaces and helpers working", () => {
    expect(skyline.env).toBe("wx");
    expect(skyline.logger.error).toBeTypeOf("function");
    expect(skyline.query.parse).toBeTypeOf("function");
    expect(skyline.isFunction((): void => undefined)).toBe(true);
    expect(skyline.type([])).toBe("array");
  });

  it("round-trips base64 through the re-exported helpers", () => {
    const bytes = new TextEncoder().encode("mptool").buffer;
    const encoded = skyline.encodeBase64(bytes);
    const decoded = skyline.decodeBase64(encoded);

    expect(new TextDecoder().decode(decoded)).toBe("mptool");
  });

  it("exports the MpError class used by request failures", async () => {
    expect(new skyline.MpError({ code: 1, message: "boom" })).toBeInstanceOf(Error);

    mockWx.failNext("request", { type: "network" });

    try {
      const failure = await skyline.request("https://example.com/api").catch((err: unknown) => err);

      // The bundle must expose the exact class `request` rejects with, otherwise callers cannot
      // use `instanceof MpError` for the documented error contract.
      expect(failure).toBeInstanceOf(skyline.MpError);
    } finally {
      mockWx.reset();
    }
  });
});
