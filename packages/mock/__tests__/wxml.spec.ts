import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

describe("wxml mock", () => {
  it("createSelectorQuery should be chainable and exec with null results", () => {
    const query = wx.createSelectorQuery();

    query.select("#foo").boundingClientRect();
    query.selectAll(".bar").scrollOffset();
    query.selectViewport();

    expect(() =>
      query.exec((res) => {
        expect(res).toStrictEqual([null, null, null]);
      }),
    ).not.toThrow();
  });

  it("createSelectorQuery exec should call boundingClientRect callback with null", () => {
    const query = wx.createSelectorQuery();

    let called = false;

    query.select("#foo").boundingClientRect((rect) => {
      called = true;
      expect(rect).toBeNull();
    });
    query.exec();
    expect(called).toBe(true);
  });

  it("createSelectorQuery exec result length should match node count", () => {
    const query = wx.createSelectorQuery();

    const called = [false, false, false];

    query.select("#a").boundingClientRect(() => {
      called[0] = true;
    });
    query.select("#b").fields({}, () => {
      called[1] = true;
    });
    query.selectAll(".c").scrollOffset(() => {
      called[2] = true;
    });

    query.exec((res) => {
      expect(res).toHaveLength(3);
    });
    expect(called).toStrictEqual([true, true, true]);
  });

  it("createSelectorQuery in should not throw", () => {
    const query = wx.createSelectorQuery();

    expect(() => query.in({}).select("#foo").exec()).not.toThrow();
  });

  it("createIntersectionObserver should be chainable and not throw", () => {
    const observer = wx.createIntersectionObserver();

    expect(() => {
      observer
        .relativeToViewport()
        .relativeTo("#scroll-view")
        .observe("#target", () => {});
      observer.disconnect();
      observer.takeRecords();
    }).not.toThrow();
  });

  it("createIntersectionObserver takeRecords should return empty array", () => {
    const observer = wx.createIntersectionObserver();

    expect(observer.takeRecords()).toStrictEqual([]);
  });
});
