import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmitterInstance, EventHandlerMap } from "../src/emitter";
import { Emitter } from "../src/emitter";

describe("mitt", () => {
  it("should default export be a function", () => {
    expect(typeof Emitter).toEqual("function");
  });

  it("should accept an optional event handler map", () => {
    expect(() => Emitter(new Map())).not.toThrow();
    const map = new Map();
    const a = vi.fn();
    const b = vi.fn();

    map.set("foo", [a, b]);
    const events = Emitter<{ foo: undefined }>(map);

    events.emit("foo");
    expect(a).toBeCalledTimes(1);
    expect(b).toBeCalledTimes(1);
  });
});

describe("mitt#", () => {
  const eventType = Symbol("eventType");

  type Events = {
    foo: unknown;
    constructor: unknown;
    FOO: unknown;
    bar: unknown;
    Bar: unknown;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "baz:bat!": unknown;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "baz:baT!": unknown;
    Foo: unknown;
    [eventType]: unknown;
  };
  let events: EventHandlerMap<Events>, inst: EmitterInstance<Events>;

  beforeEach(() => {
    events = new Map();
    inst = Emitter(events);
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
      expect(typeof inst.on).toEqual("function");
    });

    it("should register handler for new type", () => {
      const foo = vi.fn();

      inst.on("foo", foo);

      expect(events.get("foo")).toEqual([foo]);
    });

    it("should register handlers for any type strings", () => {
      const foo = vi.fn();

      inst.on("constructor", foo);

      expect(events.get("constructor")).toEqual([foo]);
    });

    it("should append handler for existing type", () => {
      const foo = vi.fn();
      const bar = vi.fn();

      inst.on("foo", foo);
      inst.on("foo", bar);

      expect(events.get("foo")).toEqual([foo, bar]);
    });

    it("should NOT normalize case", () => {
      const foo = vi.fn();

      inst.on("FOO", foo);
      inst.on("Bar", foo);
      inst.on("baz:baT!", foo);

      expect(events.get("FOO")).toEqual([foo]);
      expect(events.has("foo")).toEqual(false);
      expect(events.get("Bar")).toEqual([foo]);
      expect(events.has("bar")).toEqual(false);
      expect(events.get("baz:baT!")).toEqual([foo]);
    });

    it("can take symbols for event types", () => {
      const foo = vi.fn();

      inst.on(eventType, foo);
      expect(events.get(eventType)).toEqual([foo]);
    });

    // Adding the same listener multiple times should register it multiple times.
    // See https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
    it("should add duplicate listeners", () => {
      const foo = vi.fn();

      inst.on("foo", foo);
      inst.on("foo", foo);
      expect(events.get("foo")).toEqual([foo, foo]);
    });
  });

  describe("off()", () => {
    it("should be a function", () => {
      expect(inst).toHaveProperty("off");
      expect(typeof inst.off).toEqual("function");
    });

    it("should remove handler for type", () => {
      const foo = vi.fn();

      inst.on("foo", foo);
      inst.off("foo", foo);

      expect(events.get("foo")).toEqual([]);
    });

    it("should NOT normalize case", () => {
      const foo = vi.fn();

      inst.on("FOO", foo);
      inst.on("Bar", foo);
      inst.on("baz:bat!", foo);

      inst.off("FOO", foo);
      inst.off("Bar", foo);
      inst.off("baz:baT!", foo);

      expect(events.get("FOO")).toEqual([]);
      expect(events.has("foo")).toEqual(false);
      expect(events.get("Bar")).toEqual([]);
      expect(events.has("bar")).toEqual(false);
      expect(events.get("baz:bat!")).toHaveLength(1);
    });

    it("should remove only the first matching listener", () => {
      const foo = vi.fn();

      inst.on("foo", foo);
      inst.on("foo", foo);
      inst.off("foo", foo);
      expect(events.get("foo")).toEqual([foo]);
      inst.off("foo", foo);
      expect(events.get("foo")).toEqual([]);
    });

    it('off("type") should remove all handlers of the given type', () => {
      inst.on("foo", vi.fn());
      inst.on("foo", vi.fn());
      inst.on("bar", vi.fn());
      inst.off("foo");
      expect(events.get("foo")).toEqual([]);
      expect(events.get("bar")).toHaveLength(1);
      inst.off("bar");
      expect(events.get("bar")).toEqual([]);
    });
  });

  describe("emit()", () => {
    it("should be a function", () => {
      expect(inst).toHaveProperty("emit");
      expect(typeof inst.emit).toEqual("function");
    });

    it("should invoke handler for type", () => {
      const event = { a: "b" };

      inst.on("foo", (one, two?: unknown) => {
        expect(one).toEqual(event);
        expect(two).toBeUndefined();
      });

      inst.emit("foo", event);
    });

    it("should NOT ignore case", () => {
      const onFoo = vi.fn(),
        onFOO = vi.fn();

      events.set("Foo", [onFoo]);
      events.set("FOO", [onFOO]);

      inst.emit("Foo", "Foo arg");
      inst.emit("FOO", "FOO arg");

      expect(onFoo).toBeCalledTimes(1);
      expect(onFoo).toBeCalledWith("Foo arg");
      expect(onFOO).toBeCalledTimes(1);
      expect(onFOO).toBeCalledWith("FOO arg");
    });

    it("should invoke * handlers", () => {
      const star = vi.fn(),
        ea = { a: "a" },
        eb = { b: "b" };

      events.set("*", [star]);

      inst.emit("foo", ea);
      expect(star).toBeCalledTimes(1);
      expect(star).toBeCalledWith("foo", ea);

      inst.emit("bar", eb);
      expect(star).toBeCalledTimes(2);
      expect(star).lastCalledWith("bar", eb);
    });
  });
});
