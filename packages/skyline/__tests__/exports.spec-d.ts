import { describe, expectTypeOf, it } from "vitest";

import type {
  EmitterInstance,
  Env,
  EventHandlerList,
  EventHandlerMap,
  EventType,
  Handler,
  MpErrorOptions,
  PromiseQueue,
  Task,
  WildCardEventHandlerList,
  WildcardHandler,
} from "../src/index.js";

describe("@mptool/skyline shared type exports", () => {
  it("keeps the shared types of @mptool/all", () => {
    expectTypeOf<Env>().toEqualTypeOf<"wx" | "donut" | "js">();
    expectTypeOf<EventType>().toEqualTypeOf<symbol | string>();
    expectTypeOf<MpErrorOptions>().not.toBeNever();
    expectTypeOf<Task>().not.toBeNever();
    expectTypeOf<PromiseQueue>().not.toBeNever();
    expectTypeOf<Handler>().not.toBeNever();
    expectTypeOf<WildcardHandler>().not.toBeNever();
    expectTypeOf<EventHandlerList>().not.toBeNever();
    expectTypeOf<WildCardEventHandlerList>().not.toBeNever();
    expectTypeOf<EventHandlerMap<Record<string, unknown>>>().not.toBeNever();
    expectTypeOf<EmitterInstance<Record<string, unknown>>>().not.toBeNever();
  });
});
