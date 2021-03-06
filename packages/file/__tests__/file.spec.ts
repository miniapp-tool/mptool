import "@mptool/mock";
import { describe, expect, it } from "vitest";
import { get, getAsync, set, setAync } from "../src";

describe("set", () => {
  it("set sync simple", () => {
    set("simple-sync", "zhangbowang");
    expect(get("simple-sync")).toEqual("zhangbowang");
  });

  it("set sync", () => {
    set("data-sync", { title: 123 });
    expect(get("data-sync")).toEqual({ title: 123 });
  });

  it("set async", () =>
    new Promise((resolve) => {
      void setAync("data-async", { title: 123 }).then(() => {
        expect(get("data-async")).toEqual({ title: 123 });
        resolve();
      });
    }));

  it("set expire", () =>
    new Promise((resolve) => {
      void setAync("data-expire", { title: 123 }, 100).then(() => {
        setTimeout(() => {
          void getAsync("data-expire").then((data) => {
            expect(data).toEqual(undefined);
            resolve();
          });
        }, 150);
      });
    }));

  it("set expire x2", () =>
    new Promise((resolve) => {
      void setAync("data-expire-x2", { title: 123 }, 100).then(() => {
        set("data-expire-x2", { title: 456 }, 200);
        setTimeout(() => {
          expect(get("data-expire-x2")).toEqual({ title: 456 });
          resolve();
        }, 150);
      });
    }));

  it("set expire then update value", () =>
    new Promise((resolve) => {
      void setAync("data-expire-update", { title: 123 }, 100).then(() => {
        set("data-expire-update", { title: 456 }, "keep");
        setTimeout(() => {
          expect(get("data-expire-update")).toEqual(undefined);
          resolve();
        }, 200);
      });
    }));
});
