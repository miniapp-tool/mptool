import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import type { error, filter } from "../src/logger.js";

describe("logger capability detection", () => {
  it("should tolerate a realtime manager without setFilterMsg and log errors once", async () => {
    const wxAny = wx as unknown as {
      env: Record<string, unknown>;
      getRealtimeLogManager: () => unknown;
    };
    const original = wxAny.getRealtimeLogManager;

    // `console` has no `setFilterMsg`, which is what the mock used to return.
    wxAny.getRealtimeLogManager = (): unknown => console;

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const mod = (await import("../src/logger.js?capability")) as {
        error: typeof error;
        filter: typeof filter;
      };

      expect(() => mod.filter("x")).not.toThrow();

      mod.error("boom");

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("boom");
    } finally {
      errorSpy.mockRestore();
      wxAny.getRealtimeLogManager = original;
    }
  });
});
