import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { retry } from "../src/index.js";

describe(retry, () => {
  it("should call retry action on confirm", async () => {
    const retryAction = vi.fn<() => void>();

    retry("title", "content", retryAction);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(retryAction).toHaveBeenCalledTimes(1);
  });
});
