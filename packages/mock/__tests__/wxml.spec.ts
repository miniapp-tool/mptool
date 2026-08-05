import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

describe("wxml mock", () => {
  it("createSelectorQuery should be chainable and exec with empty result", () => {
    const query = wx.createSelectorQuery();

    query.select("#foo").boundingClientRect();
    query.selectAll(".bar").scrollOffset();
    query.selectViewport();

    expect(() =>
      query.exec((res) => {
        expect(res).toStrictEqual([]);
      }),
    ).not.toThrow();
  });

  it("createSelectorQuery exec should call boundingClientRect callback with null", () => {
    const query = wx.createSelectorQuery();

    query.select("#foo").boundingClientRect((rect) => {
      expect(rect).toBeNull();
    });
    query.exec();
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
