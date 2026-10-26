// oxlint-disable vitest/no-conditional-in-test, vitest/no-conditional-expect -- the tests iterate the typings-derived API list
import { afterEach, describe, expect, it, vi } from "vitest";

import { EVENT_OFF_APIS, EVENT_ON_APIS, eventNameFor } from "../src/apis/events.js";
import { mockWx, wx } from "../src/index.js";

const eventWx = wx as unknown as Record<string, (listener?: (...args: any[]) => void) => void>;

describe("generic event APIs", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  it("should expose every on/off pair declared by the typings", () => {
    expect(EVENT_ON_APIS).toHaveLength(71);
    expect(EVENT_OFF_APIS.size).toBe(62);

    const eventApis = wx as unknown as Record<string, unknown>;

    for (const name of EVENT_ON_APIS) {
      expect(eventApis[name]).toBeTypeOf("function");

      const offName = `off${name.slice(2)}`;

      if (EVENT_OFF_APIS.has(offName)) expect(eventApis[offName]).toBeTypeOf("function");
    }
  });

  it("should deliver emitted events to registered listeners", () => {
    const listener = vi.fn<(payload: string) => void>();

    eventWx.onError(listener);
    mockWx.emit(eventNameFor("onError"), "boom");

    expect(listener).toHaveBeenCalledWith("boom");
  });

  it("should pass every argument through", () => {
    const listener = vi.fn<(first: string, second: number) => void>();

    eventWx.onPageNotFound(listener);
    mockWx.emit(eventNameFor("onPageNotFound"), "/missing", 404);

    expect(listener).toHaveBeenCalledWith("/missing", 404);
  });

  it("should remove a single listener through off", () => {
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();

    eventWx.onMemoryWarning(first);
    eventWx.onMemoryWarning(second);
    eventWx.offMemoryWarning(first);
    mockWx.emit(eventNameFor("onMemoryWarning"));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("should remove every listener when off is called without an argument", () => {
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();

    eventWx.onMemoryWarning(first);
    eventWx.onMemoryWarning(second);
    eventWx.offMemoryWarning();
    mockWx.emit(eventNameFor("onMemoryWarning"));

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it("should support acronym event names", () => {
    expect(eventNameFor("onBLEConnectionStateChange")).toBe("bleConnectionStateChange");
    expect(eventNameFor("onVoIPChatStateChanged")).toBe("voipChatStateChanged");
    expect(eventNameFor("onWiFiConnected")).toBe("wifiConnected");
    expect(eventNameFor("onNFCStateChange")).toBe("nfcStateChange");
  });

  it("should register, emit and remove every event pair", () => {
    for (const onName of EVENT_ON_APIS) {
      const listener = vi.fn<() => void>();

      eventWx[onName](listener);
      mockWx.emit(eventNameFor(onName), "payload");

      expect(listener).toHaveBeenCalledWith("payload");

      const offName = `off${onName.slice(2)}`;

      if (EVENT_OFF_APIS.has(offName)) {
        eventWx[offName](listener);
        mockWx.emit(eventNameFor(onName), "payload");

        expect(listener).toHaveBeenCalledTimes(1);
      }
    }
  });

  it("should ignore events without listeners", () => {
    expect(() => {
      mockWx.emit(eventNameFor("onError"), "boom");
    }).not.toThrow();
  });
});
