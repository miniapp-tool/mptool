import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { check, checkAsync, get, getAsync, set, setAsync } from "../src/storage.js";

describe(set, () => {
  it("set sync simple", () => {
    set("simple-sync", "mister-hope");
    expect(get("simple-sync")).toBe("mister-hope");
  });

  it("set sync", () => {
    set("data-sync", { title: 123 });
    expect(get("data-sync")).toStrictEqual({ title: 123 });
  });

  it("set async", () =>
    new Promise<void>((resolve) => {
      void setAsync("data-async", { title: 123 }).then(() => {
        expect(get("data-async")).toStrictEqual({ title: 123 });
        resolve();
      });
    }));

  it("set expire", async () => {
    await setAsync("data-expire", { title: 123 }, 100);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 150);
    });

    const data = await getAsync("data-expire");

    expect(data).toBeUndefined();
  });

  it("set expire x2", () =>
    new Promise<void>((resolve) => {
      void setAsync("data-expire-x2", { title: 123 }, 100).then(() => {
        set("data-expire-x2", { title: 456 }, 200);
        setTimeout(() => {
          expect(get("data-expire-x2")).toStrictEqual({ title: 456 });
          resolve();
        }, 150);
      });
    }));

  it("set expire then update value", () =>
    new Promise<void>((resolve) => {
      void setAsync("data-expire-update", { title: 123 }, 100).then(() => {
        set("data-expire-update", { title: 456 }, "keep");
        setTimeout(() => {
          expect(get("data-expire-update")).toBeUndefined();
          resolve();
        }, 200);
      });
    }));
});

describe(check, () => {
  it("should keep permanent cache", () => {
    set("check-permanent", { a: 1 }, 0);

    check();

    expect(get("check-permanent")).toStrictEqual({ a: 1 });
  });

  it("should remove expired cache", () =>
    new Promise<void>((resolve) => {
      set("check-expired", { a: 1 }, 50);

      setTimeout(() => {
        check();

        expect(get("check-expired")).toBeUndefined();
        resolve();
      }, 100);
    }));
});

describe(checkAsync, () => {
  it("should keep permanent cache", async () => {
    await setAsync("check-async-permanent", { a: 1 }, 0);

    await checkAsync();

    await expect(getAsync("check-async-permanent")).resolves.toStrictEqual({ a: 1 });
  });

  it("should remove expired cache", async () => {
    await setAsync("check-async-expired", { a: 1 }, 50);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    await checkAsync();

    await expect(getAsync("check-async-expired")).resolves.toBeUndefined();
  });
});
