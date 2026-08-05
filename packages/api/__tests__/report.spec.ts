import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { reportNetworkStatus } from "../src/index.js";

describe(reportNetworkStatus, () => {
  it("should not throw", () => {
    expect(() => reportNetworkStatus()).not.toThrow();
  });
});
