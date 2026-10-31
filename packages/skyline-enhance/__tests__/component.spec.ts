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

  it("should ignore an unchanged ref", () => {
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
      $refID: "sameRef",
      $parent: parent,
      data: { ref: "sameRef" },
    };

    componentOptions?.observers?.ref?.call(instance, "sameRef");

    // 值未变化：不重复删除 / 注册
    expect(instance.$refID).toBe("sameRef");
    expect(parent.$refs.size).toBe(0);
  });

  it("should unregister the ref when it becomes empty", () => {
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
      data: { ref: "" },
    };

    parent.$refs.set("oldRef", instance);

    componentOptions?.observers?.ref?.call(instance, "");

    // 空 ref 只做注销，不把组件登记为匿名引用
    expect(instance.$refID).toBe("");
    expect(parent.$refs.size).toBe(0);
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

  it("should not throw on detached without a ref or parent", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const instance: { $id: number; $refID: string; $parent?: unknown } = { $id: 42, $refID: "" };

    expect(() => componentOptions?.lifetimes?.detached?.call(instance)).not.toThrow();
    expect(instance.$parent).toBeUndefined();
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

  it("should use the parent as root when the parent has no root", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const parent = { $refs: new Map() };
    const instance: Record<string, unknown> = {};

    componentOptions?.methods?.$attached?.call(instance, parent);

    // 顶层组件没有 $root：以父节点自身作为根
    expect(instance.$root).toBe(parent);
    expect(instance.$parent).toBe(parent);
  });
});

describe("$ (bind)", () => {
  interface BindEvent {
    detail: { id: number; event: string; args: unknown[] };
  }

  const getBind = (
    componentOptions: TrivialComponentOptions | undefined,
  ): ((event: BindEvent) => void) | undefined =>
    (componentOptions?.methods as unknown as { $?: (event: BindEvent) => void })?.$;

  const getAttached = (
    componentOptions: TrivialComponentOptions | undefined,
  ): ((this: unknown) => void) | undefined =>
    (componentOptions?.lifetimes as unknown as { attached?: (this: unknown) => void })?.attached;

  it("should dispatch custom method", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const method = vi.fn<(a: number, b: number) => void>();
    const instance = { customMethod: method };

    getBind(componentOptions)?.call(instance, {
      detail: { id: 1, event: "customMethod", args: [1, 2] },
    });

    expect(method).toHaveBeenCalledWith(1, 2);
  });

  it("should not throw when method is missing", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    expect(() =>
      getBind(componentOptions)?.call({}, { detail: { id: 1, event: "missing", args: [] } }),
    ).not.toThrow();
  });

  it("should attach ref on $attached event and lazily initialize $refs when missing", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const childInstance = {
      $id: 0,
      $refID: "",
      data: { ref: "childRef" },
      triggerEvent: vi.fn<() => void>(),
      $attached: vi.fn<(parent: unknown) => void>(),
    };

    // 通过 attached 生命周期注册 ref
    getAttached(componentOptions)?.call(childInstance);

    const parent = { $refs: new Map<string, unknown>() };

    getBind(componentOptions)?.call(parent, {
      detail: { id: childInstance.$id, event: "$attached", args: [] },
    });

    expect(parent.$refs.get("childRef")).toBe(childInstance);
    expect(childInstance.$attached).toHaveBeenCalledWith(parent);

    // 页面实例在 onLoad 之前触发子组件 attached 时，$refs 尚未初始化，应按需创建
    const uninitializedPage: { $refs?: Map<string, unknown> } = {};

    getBind(componentOptions)?.call(uninitializedPage, {
      detail: { id: childInstance.$id, event: "$attached", args: [] },
    });

    expect(uninitializedPage.$refs).toBeInstanceOf(Map);
    expect(uninitializedPage.$refs?.get("childRef")).toBe(childInstance);
  });

  it("should attach ref without registering an unnamed ref", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const childInstance = {
      $id: 0,
      $refID: "",
      data: { ref: "" },
      triggerEvent: vi.fn<() => void>(),
      $attached: vi.fn<(parent: unknown) => void>(),
    };

    // 子组件没有设置 ref：attached 后 $refID 为空
    getAttached(componentOptions)?.call(childInstance);

    const parent = { $refs: new Map<string, unknown>() };

    getBind(componentOptions)?.call(parent, {
      detail: { id: childInstance.$id, event: "$attached", args: [] },
    });

    // 匿名引用不写入父组件的 $refs，但仍需完成 $attached
    expect(parent.$refs.size).toBe(0);
    expect(childInstance.$attached).toHaveBeenCalledWith(parent);
  });

  it("should ignore $attached when ref is missing", () => {
    $Config({ defaultPage: "/pages/$name" });

    let componentOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      componentOptions = options;
    };

    $Component({});

    const parent = { $refs: new Map<string, unknown>() };

    expect(() =>
      getBind(componentOptions)?.call(parent, {
        detail: { id: 999, event: "$attached", args: [] },
      }),
    ).not.toThrow();
  });
});

describe("should inject component config", () => {
  it("should inject before registration and allow overriding framework methods", () => {
    const calls: string[] = [];
    const overriddenCall = (): void => {
      calls.push("override");
    };
    let injectedOptions: TrivialComponentOptions | undefined,
      registeredOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      calls.push("register");
      registeredOptions = options;
    };

    $Config({
      defaultPage: "/pages/$name",
      injectComponent: (options) => {
        calls.push("inject");
        injectedOptions = options;

        options.methods = {
          ...options.methods,
          injected: (): string => "injected",
          $call: overriddenCall,
        };
      },
    });

    $Component({});

    // 注入必须发生在组件注册之前，这样才能覆盖框架注入的方法
    expect(calls).toStrictEqual(["inject", "register"]);
    expect(injectedOptions).toBe(registeredOptions);
    expect(registeredOptions?.methods?.injected).toBeTypeOf("function");
    expect(registeredOptions?.methods?.$call).toBe(overriddenCall);
  });

  it("should inject only once per registration, not per instance", () => {
    const injectComponent = vi.fn<() => void>();
    let registeredOptions: TrivialComponentOptions | undefined;

    (globalThis as any).Component = (options: any): void => {
      registeredOptions = options;
    };

    $Config({ defaultPage: "/pages/$name", injectComponent });

    $Component({});

    expect(injectComponent).toHaveBeenCalledTimes(1);

    // created 生命周期只负责挂载实例，不再重复执行注入
    registeredOptions?.lifetimes?.created?.call({});
    registeredOptions?.lifetimes?.created?.call({});

    expect(injectComponent).toHaveBeenCalledTimes(1);
  });
});

describe("should extend component config", () => {
  it("should run extendComponent before the framework extension", () => {
    const calls: string[] = [];
    let extendedOptions: TrivialComponentOptions | undefined,
      registeredOptions: TrivialComponentOptions | undefined;
    let extendedSnapshot: Record<string, unknown> = {};

    (globalThis as any).Component = (options: any): void => {
      calls.push("register");
      registeredOptions = options;
    };

    $Config({
      defaultPage: "/pages/$name",
      extendComponent: (options) => {
        calls.push("extend");
        extendedOptions = options;

        // 记录调用瞬间的状态：options 在后续步骤中会被就地修改
        extendedSnapshot = { ...options };
      },
    });

    $Component({});

    expect(calls).toStrictEqual(["extend", "register"]);
    expect(extendedOptions).toBe(registeredOptions);

    // extendComponent 早于框架扩展：生命周期、注入方法与属性转换都尚未执行
    expect(extendedSnapshot.lifetimes).toBeUndefined();
    expect(extendedSnapshot.methods).toBeUndefined();
    expect(extendedSnapshot.properties).toBeUndefined();
  });
});
