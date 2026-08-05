import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { confirm } from "../src/index.js";

describe(confirm, () => {
  it("should call confirm action", async () => {
    const action = vi.fn<() => void>();

    confirm("删除", action);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(action).toHaveBeenCalledTimes(1);
  });
});
