import "@mptool/mock";
import { handleProperties } from "../src/component";

describe("Should handel properties", () => {
  it("Should handle empty properties", () => {
    expect(handleProperties()).toEqual({ ref: { type: String, value: "" } });
  });

  it("Should keep contructor and 'null' as is", () => {
    expect(
      handleProperties({
        a: null,
        b: String,
        c: Number,
        d: Boolean,
        e: Object,
        f: Array,
      })
    ).toEqual({
      a: null,
      b: String,
      c: Number,
      d: Boolean,
      e: Object,
      f: Array,
      ref: { type: String, value: "" },
    });
  });

  it("Should keep simple type as is", () => {
    expect(
      handleProperties({
        a: { type: null },
        b: { type: String },
        c: { type: Number },
        d: { type: Boolean },
        e: { type: Object },
        f: { type: Array },
      })
    ).toEqual({
      a: { type: null },
      b: { type: String },
      c: { type: Number },
      d: { type: Boolean },
      e: { type: Object },
      f: { type: Array },
      ref: { type: String, value: "" },
    });
  });

  it("Should rename 'default' as 'value'", () => {
    expect(
      handleProperties({
        a: { type: null, default: "" },
        b: { type: String, default: "" },
        c: { type: Number, default: 1 },
        d: { type: Boolean, default: false },
        e: { type: Object, default: { a: 1 } },
        f: { type: Array, default: ["a", "b"] },
      })
    ).toEqual({
      a: { type: null, value: "" },
      b: { type: String, value: "" },
      c: { type: Number, value: 1 },
      d: { type: Boolean, value: false },
      e: { type: Object, value: { a: 1 } },
      f: { type: Array, value: ["a", "b"] },
      ref: { type: String, value: "" },
    });
  });

  it("Should handle mutiple types", () => {
    expect(
      handleProperties({
        a: { type: [String, Number, Boolean], default: "" },
        b: { type: [Number, Array], default: 1 },
      })
    ).toEqual({
      a: { type: String, value: "", optionalTypes: [Number, Boolean] },
      b: { type: Number, value: 1, optionalTypes: [Array] },
      ref: { type: String, value: "" },
    });
  });
});
