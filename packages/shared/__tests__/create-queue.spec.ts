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
    expect(res).toStrictEqual({ interrupted: false });
    expect(result).toStrictEqual([1, 2, 3]);
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
    expect(res).toStrictEqual({ interrupted: false });
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
    expect(res).toStrictEqual({ interrupted: true, msg: "custom message" });
  });

  it("should not mutate the caller's action list", async () => {
    const actionList = [
      async (): Promise<void> => {
        await Promise.resolve();
      },
      async (): Promise<void> => {
        await Promise.resolve();
      },
    ];

    const queue = createQueue(actionList);

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });
    expect(actionList).toHaveLength(2);
  });

  it("should wait for every in-flight task before resolving after stop()", async () => {
    const finished: number[] = [];
    const actionList = [
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 10);
        });
        finished.push(1);
      },
      async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 40);
        });
        finished.push(2);
      },
      (): Promise<void> => {
        finished.push(3);

        return Promise.resolve();
      },
    ];
    const queue = createQueue<string>(actionList, 2);
    const running = queue.run();

    queue.stop("stopped");

    const early = await Promise.race([
      running.then(() => "resolved"),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("pending"), 25);
      }),
    ]);

    // Task 1 is done at 10ms, but task 2 is still in flight, so the queue must not resolve yet.
    expect(early).toBe("pending");
    await expect(running).resolves.toStrictEqual({ interrupted: true, msg: "stopped" });
    expect(finished).toStrictEqual([1, 2]);
  });

  it("should resolve an empty queue with capacity > 1", async () => {
    const queue = createQueue<never>([], 2);

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });
  });

  it("should resolve when stopped before any task starts", async () => {
    const action = async (): Promise<void> => {};
    const queue = createQueue<string>([action], 0);
    const running = queue.run();

    queue.stop("stopped");

    await expect(running).resolves.toStrictEqual({ interrupted: true, msg: "stopped" });
  });

  it("should be runnable again after stop()", async () => {
    const result: number[] = [];
    const queue = createQueue<string>([
      (): Promise<void> => {
        result.push(1);

        return Promise.resolve();
      },
      (): Promise<void> => {
        result.push(2);

        return Promise.resolve();
      },
    ]);

    queue.stop("first");

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: true, msg: "first" });
    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });
    expect(result).toStrictEqual([1, 2]);
  });

  it("should include tasks pushed to the action list after creation", async () => {
    const result: number[] = [];
    const actionList = [
      (): Promise<void> => {
        result.push(1);

        return Promise.resolve();
      },
    ];
    const queue = createQueue(actionList);

    actionList.push((): Promise<void> => {
      result.push(2);

      return Promise.resolve();
    });

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });
    expect(result).toStrictEqual([1, 2]);
  });

  it("should run the full action list again on a second run", async () => {
    const result: number[] = [];
    const queue = createQueue([
      (): Promise<void> => {
        result.push(1);

        return Promise.resolve();
      },
      (): Promise<void> => {
        result.push(2);

        return Promise.resolve();
      },
    ]);

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });
    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });

    expect(result).toStrictEqual([1, 2, 1, 2]);
  });

  it("should ignore a late stop() after the run has completed", async () => {
    const result: number[] = [];
    const queue = createQueue<string>([
      (): Promise<void> => {
        result.push(1);

        return Promise.resolve();
      },
    ]);

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });

    // A late stop has nothing left to cancel; it must not poison the next run.
    queue.stop("late");

    await expect(queue.run()).resolves.toStrictEqual({ interrupted: false });
    expect(result).toStrictEqual([1, 1]);
  });

  it("should not be stuck when a task rejects", async () => {
    const result: number[] = [];
    const queue = createQueue([
      (): Promise<void> => {
        result.push(1);

        return Promise.reject(new Error("task error"));
      },
      (): Promise<void> => {
        result.push(2);

        return Promise.resolve();
      },
    ]);

    const res = await queue.run();

    expect(res).toStrictEqual({ interrupted: false });
    expect(result).toStrictEqual([1, 2]);
  });
});
