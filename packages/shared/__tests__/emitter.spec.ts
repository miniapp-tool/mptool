import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { EmitterInstance, EventHandlerMap } from "../src/emitter";
import { Emitter } from "../src/emitter";

describe(Emitter, () => {
  const eventType = Symbol("eventType");

  interface Events {
    foo: unknown;
    constructor: unknown;
    FOO: unknown;
    bar: unknown;
    Bar: unknown;
    "baz:bat!": unknown;
    "baz:baT!": unknown;
    Foo: unknown;
    [eventType]: unknown;
  }
  let events: EventHandlerMap<Events>, inst: EmitterInstance<Events>;

  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    events = new Map();
    inst = Emitter(events);
  });

  it("should default export be a function", () => {
    expectTypeOf(Emitter).toBeFunction();
  });

  it("should accept an optional event handler map", () => {
    expect(() => Emitter(new Map())).not.toThrow();
    const map: EventHandlerMap<{ foo: undefined }> = new Map();
    const a = vi.fn<() => void>();
    const b = vi.fn<() => void>();

    map.set("foo", [a, b]);
    const emitter = Emitter<{ foo: undefined }>(map);

    emitter.emit("foo");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  describe("properties", () => {
    it("should expose the event handler map", () => {
      expect(inst).toHaveProperty("all");
      expect(inst.all).toBeInstanceOf(Map);
    });
  });

  describe("on()", () => {
    it("should be a function", () => {
      expect(inst).toHaveProperty("on");
      expectTypeOf(inst.on).toBeFunction();
    });

    it("should register handler for new type", () => {
      const foo = vi.fn<() => void>();

      inst.on("foo", foo);

      expect(events.get("foo")).toStrictEqual([foo]);
    });

    it("should register handlers for any type strings", () => {
      const foo = vi.fn<() => void>();

      inst.on("constructor", foo);

      expect(events.get("constructor")).toStrictEqual([foo]);
    });

    it("should append handler for existing type", () => {
      const foo = vi.fn<() => void>();
      const bar = vi.fn<() => void>();

      inst.on("foo", foo);
      inst.on("foo", bar);

      expect(events.get("foo")).toStrictEqual([foo, bar]);
    });

    it("should NOT normalize case", () => {
      const foo = vi.fn<() => void>();

      inst.on("FOO", foo);
      inst.on("Bar", foo);
      inst.on("baz:baT!", foo);

      expect(events.get("FOO")).toStrictEqual([foo]);
      expect(events.has("foo")).toBe(false);
      expect(events.get("Bar")).toStrictEqual([foo]);
      expect(events.has("bar")).toBe(false);
      expect(events.get("baz:baT!")).toStrictEqual([foo]);
    });

    it("can take symbols for event types", () => {
      const foo = vi.fn<() => void>();

      inst.on(eventType, foo);
      expect(events.get(eventType)).toStrictEqual([foo]);
    });

    // Adding the same listener multiple times should register it multiple times.
    // See https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
    it("should add duplicate listeners", () => {
      const foo = vi.fn<() => void>();

      inst.on("foo", foo);
      inst.on("foo", foo);
      expect(events.get("foo")).toStrictEqual([foo, foo]);
    });
  });

  describe("off()", () => {
    it("should be a function", () => {
      expect(inst).toHaveProperty("off");
      expectTypeOf(inst.off).toBeFunction();
    });

    it("should remove handler for type", () => {
      const foo = vi.fn<() => void>();

      inst.on("foo", foo);
      inst.off("foo", foo);

      expect(events.get("foo")).toStrictEqual([]);
    });

    it("should NOT normalize case", () => {
      const foo = vi.fn<() => void>();

      inst.on("FOO", foo);
      inst.on("Bar", foo);
      inst.on("baz:bat!", foo);

      inst.off("FOO", foo);
      inst.off("Bar", foo);
      inst.off("baz:baT!", foo);

      expect(events.get("FOO")).toStrictEqual([]);
      expect(events.has("foo")).toBe(false);
      expect(events.get("Bar")).toStrictEqual([]);
      expect(events.has("bar")).toBe(false);
      expect(events.get("baz:bat!")).toHaveLength(1);
    });

    it("should remove only the first matching listener", () => {
      const foo = vi.fn<() => void>();

      inst.on("foo", foo);
      inst.on("foo", foo);
      inst.off("foo", foo);
      expect(events.get("foo")).toStrictEqual([foo]);
      inst.off("foo", foo);
      expect(events.get("foo")).toStrictEqual([]);
    });

    it('off("type") should remove all handlers of the given type', () => {
      inst.on("foo", vi.fn());
      inst.on("foo", vi.fn());
      inst.on("bar", vi.fn());
      inst.off("foo");
      expect(events.get("foo")).toStrictEqual([]);
      expect(events.get("bar")).toHaveLength(1);
      inst.off("bar");
      expect(events.get("bar")).toStrictEqual([]);
    });
  });

  describe("emit()", () => {
    it("should be a function", () => {
      expect(inst).toHaveProperty("emit");
      expectTypeOf(inst.emit).toBeFunction();
    });

    it("should invoke handler for type", () => {
      const event = { a: "b" };

      inst.on("foo", (one, two?: unknown) => {
        expect(one).toStrictEqual(event);
        expect(two).toBeUndefined();
      });

      inst.emit("foo", event);
    });

    it("should NOT ignore case", () => {
      const onFOO = vi.fn<() => void>();
      const onFoo = vi.fn<() => void>();

      events.set("Foo", [onFoo]);
      events.set("FOO", [onFOO]);

      inst.emit("Foo", "Foo arg");
      inst.emit("FOO", "FOO arg");

      expect(onFoo).toHaveBeenCalledTimes(1);
      expect(onFoo).toHaveBeenCalledWith("Foo arg");
      expect(onFOO).toHaveBeenCalledTimes(1);
      expect(onFOO).toHaveBeenCalledWith("FOO arg");
    });

    it("should invoke * handlers", () => {
      const ea = { a: "a" };
      const eb = { b: "b" };
      const star = vi.fn<() => void>();

      events.set("*", [star]);

      inst.emit("foo", ea);
      expect(star).toHaveBeenCalledTimes(1);
      expect(star).toHaveBeenCalledWith("foo", ea);

      inst.emit("bar", eb);
      expect(star).toHaveBeenCalledTimes(2);
      expect(star).toHaveBeenLastCalledWith("bar", eb);
    });
  });
});
