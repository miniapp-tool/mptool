import { afterEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const createQuery = (): ReturnType<typeof wx.createSelectorQuery> => wx.createSelectorQuery();

describe("wxml mock", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("selector query", () => {
    it("should return null / [] without fixtures", async () => {
      const results: unknown[] = [];

      createQuery()
        .select("#missing")
        .boundingClientRect((rect) => {
          results.push(rect);
        })
        .selectAll(".missing")
        .boundingClientRect((rects) => {
          results.push(rects);
        })
        .selectViewport()
        .scrollOffset((offset) => {
          results.push(offset);
        })
        .exec((res) => {
          results.push(res);
        });

      await tick();

      expect(results).toStrictEqual([null, [], null, [null, [], null]]);
    });

    it("should call exec asynchronously", async () => {
      let called = false;

      createQuery()
        .select("#foo")
        .boundingClientRect(() => {
          called = true;
        })
        .exec();

      expect(called).toBe(false);

      await tick();

      expect(called).toBe(true);
    });

    it("should return a registered node rect", async () => {
      mockWx.node("#foo", {
        dataset: { role: "button" },
        height: 50,
        id: "foo",
        left: 10,
        top: 20,
        width: 100,
      });

      const results: unknown[] = [];

      createQuery()
        .select("#foo")
        .boundingClientRect((rect) => {
          results.push(rect);
        })
        .exec();

      await tick();

      expect(results[0]).toStrictEqual({
        bottom: 70,
        dataset: { role: "button" },
        height: 50,
        id: "foo",
        left: 10,
        right: 110,
        top: 20,
        width: 100,
      });
    });

    it("should return all fixtures for selectAll", async () => {
      mockWx.node(".item", { height: 10, width: 10 });
      mockWx.node(".item", { height: 20, width: 20 });

      const results: unknown[][] = [];

      createQuery()
        .selectAll(".item")
        .boundingClientRect((rects) => {
          results.push(rects as unknown[]);
        })
        .exec();

      await tick();

      expect(results[0]).toHaveLength(2);
      expect(results[0][0]).toMatchObject({ height: 10, width: 10 });
      expect(results[0][1]).toMatchObject({ height: 20, width: 20 });
    });

    it("should resolve fields / node / context / ref", async () => {
      const node = { tagName: "view" };
      const context = { kind: "rendering-context" };
      const ref = { kind: "component" };

      mockWx.node("#node", {
        dataset: { a: 1 },
        fields: { custom: "value" },
        height: 20,
        id: "node",
        left: 1,
        node,
        top: 2,
        width: 30,
      });
      mockWx.node("#context", { context });
      mockWx.node("#ref", { ref });

      const fields: unknown[] = [];
      const nodes: unknown[] = [];
      const contexts: unknown[] = [];
      const refs: unknown[] = [];

      createQuery()
        .select("#node")
        .fields(
          { dataset: true, id: true, properties: true, rect: true, scrollOffset: true, size: true },
          (result) => {
            fields.push(result);
          },
        )
        .select("#node")
        .node((result) => {
          nodes.push(result);
        })
        .select("#context")
        .context((result) => {
          contexts.push(result);
        })
        .select("#ref")
        .ref((result) => {
          refs.push(result);
        })
        .exec();

      await tick();

      expect(fields[0]).toStrictEqual({
        custom: "value",
        dataset: { a: 1 },
        id: "node",
        properties: {},
        rect: { bottom: 22, left: 1, right: 31, top: 2 },
        scrollOffset: { scrollLeft: 0, scrollTop: 0 },
        size: { height: 20, width: 30 },
      });
      expect(nodes[0]).toBe(node);
      expect(contexts[0]).toBe(context);
      expect(refs[0]).toBe(ref);
    });

    it("should return scroll offsets", async () => {
      mockWx.node("#scroll", { scrollHeight: 500, scrollLeft: 2, scrollTop: 40, scrollWidth: 300 });

      const results: unknown[] = [];

      createQuery()
        .select("#scroll")
        .scrollOffset((offset) => {
          results.push(offset);
        })
        .exec();

      await tick();

      expect(results[0]).toStrictEqual({
        scrollHeight: 500,
        scrollLeft: 2,
        scrollTop: 40,
        scrollWidth: 300,
      });
    });

    it("should support selectViewport fixtures and in()", async () => {
      mockWx.node("viewport", { height: 667, width: 375 });

      const results: unknown[] = [];

      createQuery()
        .in({})
        .selectViewport()
        .boundingClientRect((rect) => {
          results.push(rect);
        })
        .exec();

      await tick();

      expect(results[0]).toMatchObject({ height: 667, width: 375 });
    });
  });

  describe("intersection observer", () => {
    it("should trigger observe callbacks asynchronously", async () => {
      const results: unknown[] = [];
      const observer = wx.createIntersectionObserver();

      observer.relativeToViewport().observe("#target", (result) => {
        results.push(result);
      });

      mockWx.intersection("#target", {
        boundingClientRect: { bottom: 20, height: 20, left: 0, right: 20, top: 0, width: 20 },
        intersectionRatio: 0.5,
        intersectionRect: { bottom: 10, height: 10, left: 0, right: 10, top: 0, width: 10 },
        relativeRect: { bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100 },
        time: 123,
      });

      expect(results).toStrictEqual([]);

      await tick();

      expect(results[0]).toMatchObject({ intersectionRatio: 0.5, time: 123 });
    });

    it("should not notify other selectors or after disconnect", async () => {
      const results: string[] = [];
      const observer = wx.createIntersectionObserver();

      observer.observe("#target", () => {
        results.push("target");
      });
      mockWx.intersection("#other");
      observer.disconnect();
      mockWx.intersection("#target");

      await tick();

      expect(results).toStrictEqual([]);
    });

    it("should expose records and clear them on takeRecords", async () => {
      const observer = wx.createIntersectionObserver();

      observer.relativeTo("#scroll").observe("#target", () => {});

      mockWx.intersection("#target", { intersectionRatio: 1 });

      const records = observer.takeRecords();

      expect(records).toHaveLength(1);
      expect(observer.takeRecords()).toStrictEqual([]);

      await tick();
    });
  });

  describe("state isolation", () => {
    it("should clear fixtures on reset", async () => {
      mockWx.node("#foo", { height: 10, width: 10 });

      const before: unknown[] = [];

      createQuery()
        .select("#foo")
        .boundingClientRect((rect) => {
          before.push(rect);
        })
        .exec();

      await tick();

      expect(before[0]).not.toBeNull();

      mockWx.reset();

      const after: unknown[] = [];

      createQuery()
        .select("#foo")
        .boundingClientRect((rect) => {
          after.push(rect);
        })
        .exec();

      await tick();

      expect(after[0]).toBeNull();
    });

    it("should restore fixtures through a scope", async () => {
      mockWx.node("#foo", { height: 10, width: 10 });

      const scope = mockWx.scope();

      mockWx.node("#foo", { height: 99, width: 99 });
      scope.restore();

      const results: unknown[] = [];

      createQuery()
        .select("#foo")
        .boundingClientRect((rect) => {
          results.push(rect);
        })
        .exec();

      await tick();

      expect(results[0]).toMatchObject({ height: 10, width: 10 });
    });
  });
});
