import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { createQueue } from "../src";

describe(createQueue, () => {
  it("run all tasks normally", async () => {
    const result: number[] = [];
    const queue = createQueue([
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 30);
        });
        result.push(1);
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 20);
        });
        result.push(2);
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 10);
        });
        result.push(3);
      },
    ]);

    const res = await queue.run();
    expect(res).toEqual({ interrupted: false });
    expect(result).toEqual([1, 2, 3]);
  });

  it("run tasks with concurrency", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const queue = createQueue(
      [
        async (): Promise<void> => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 50);
          });
          concurrent -= 1;
        },
        async (): Promise<void> => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 50);
          });
          concurrent -= 1;
        },
        async (): Promise<void> => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 50);
          });
          concurrent -= 1;
        },
        async (): Promise<void> => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 50);
          });
          concurrent -= 1;
        },
      ],
      2,
    );

    const res = await queue.run();
    expect(res).toEqual({ interrupted: false });
    expect(maxConcurrent).toBe(2);
  });

  it("stop queue and return message", async () => {
    const result: number[] = [];
    const queue = createQueue<string>([
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 30);
        });
        result.push(1);
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 30);
        });
        result.push(2);
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 30);
        });
        result.push(3);
      },
    ]);

    void queue.run();
    queue.stop("stopped");

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 10);
    });
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("return interrupted message when stopped", async () => {
    const queue = createQueue<string>([
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 100);
        });
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 100);
        });
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 100);
        });
      },
    ]);

    queue.stop("custom message");

    const res = await queue.run();
    expect(res).toEqual({ interrupted: true, msg: "custom message" });
  });
});
