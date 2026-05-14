import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { handleProperties } from "../src/component/index.js";

describe("should handle properties", () => {
  it("should handle empty properties", () => {
    expect(handleProperties()).toStrictEqual({ ref: { type: String, value: "" } });
  });

  it("should keep constructor and 'null' as is", () => {
    expect(
      handleProperties({
        a: null,
        b: String,
        c: Number,
        d: Boolean,
        e: Object,
        f: Array,
      }),
    ).toStrictEqual({
      a: null,
      b: String,
      c: Number,
      d: Boolean,
      e: Object,
      f: Array,
      ref: { type: String, value: "" },
    });
  });

  it("should keep simple type as is", () => {
    expect(
      handleProperties({
        a: { type: null },
        b: { type: String },
        c: { type: Number },
        d: { type: Boolean },
        e: { type: Object },
        f: { type: Array },
      }),
    ).toStrictEqual({
      a: { type: null, value: undefined },
      b: { type: String, value: undefined },
      c: { type: Number, value: undefined },
      d: { type: Boolean, value: undefined },
      e: { type: Object, value: undefined },
      f: { type: Array, value: undefined },
      ref: { type: String, value: "" },
    });
  });

  it("should rename 'default' as 'value'", () => {
    expect(
      handleProperties({
        a: { type: null, default: "" },
        b: { type: String, default: "" },
        c: { type: Number, default: 1 },
        d: { type: Boolean, default: false },
        e: { type: Object, default: { a: 1 } },
        f: { type: Array, default: ["a", "b"] },
      }),
    ).toStrictEqual({
      a: { type: null, value: "" },
      b: { type: String, value: "" },
      c: { type: Number, value: 1 },
      d: { type: Boolean, value: false },
      e: { type: Object, value: { a: 1 } },
      f: { type: Array, value: ["a", "b"] },
      ref: { type: String, value: "" },
    });
  });

  it("should handle multiple types", () => {
    expect(
      handleProperties({
        a: { type: [String, Number, Boolean], default: "" },
        b: { type: [Number, Array], default: 1 },
      }),
    ).toStrictEqual({
      a: { type: String, value: "", optionalTypes: [Number, Boolean] },
      b: { type: Number, value: 1, optionalTypes: [Array] },
      ref: { type: String, value: "" },
    });
  });
});
