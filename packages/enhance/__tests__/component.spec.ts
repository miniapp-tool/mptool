import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Component, handleProperties } from "../src/component/index.js";
import type { TrivialComponentOptions } from "../src/component/index.js";
import { $Config } from "../src/config/index.js";

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

describe("should handle dynamic ref", () => {
  it("should register new ref to parent when ref is set dynamically", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const parent = {
      $refs: new Map<string, unknown>(),
    };
    const instance = {
      $id: 1,
      $refID: "",
      $parent: parent,
      data: { ref: "" },
    };

    componentOptions?.observers?.ref?.call(instance, "newRef");

    expect(instance.$refID).toBe("newRef");
    expect(parent.$refs.get("newRef")).toBe(instance);
  });

  it("should remove old ref and register the new one", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const parent = {
      $refs: new Map<string, unknown>(),
    };
    const instance = {
      $id: 1,
      $refID: "oldRef",
      $parent: parent,
      data: { ref: "oldRef" },
    };

    parent.$refs.set("oldRef", instance);

    componentOptions?.observers?.ref?.call(instance, "newRef");

    expect(instance.$refID).toBe("newRef");
    expect(parent.$refs.has("oldRef")).toBe(false);
    expect(parent.$refs.get("newRef")).toBe(instance);
  });
});

describe("should handle component lifetimes", () => {
  it("should set id, refID and trigger attached event on attached", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const triggerEvent = vi.fn<() => void>();
    const firstInstance = {
      $id: 0,
      $refID: "",
      data: { ref: "myRef" },
      triggerEvent,
    };
    const secondInstance = {
      $id: 0,
      $refID: "",
      data: { ref: "" },
      triggerEvent,
    };

    componentOptions?.lifetimes?.attached?.call(firstInstance);
    componentOptions?.lifetimes?.attached?.call(secondInstance);

    // id 自增
    expect(secondInstance.$id).toBe(firstInstance.$id + 1);
    expect(firstInstance.$refID).toBe("myRef");
    expect(triggerEvent).toHaveBeenNthCalledWith(1, "ing", {
      id: firstInstance.$id,
      event: "$attached",
    });
  });

  it("should remove ref and parent on detached", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const parent = {
      $refs: new Map<string, unknown>(),
    };
    const instance = {
      $id: 99,
      $refID: "childRef",
      $parent: parent,
    };

    parent.$refs.set("childRef", instance);

    componentOptions?.lifetimes?.detached?.call(instance);

    expect(parent.$refs.has("childRef")).toBe(false);
    expect(instance.$parent).toBeUndefined();
  });
});

describe("should handle component methods", () => {
  it("should trigger event on $call", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const triggerEvent = vi.fn<() => void>();
    const instance = {
      $id: 1,
      triggerEvent,
    };

    componentOptions?.methods?.$call?.call(instance, "customMethod", 1, "a");

    expect(triggerEvent).toHaveBeenCalledWith("ing", {
      id: 1,
      event: "customMethod",
      args: [1, "a"],
    });
  });

  it("should set root and parent on $attached", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const page = { $root: undefined, $refs: new Map() };
    const parent = { $root: page, $refs: new Map() };
    const instance: Record<string, unknown> = {};

    componentOptions?.methods?.$attached?.call(instance, parent);

    expect(instance.$root).toBe(page);
    expect(instance.$parent).toBe(parent);
  });
});
