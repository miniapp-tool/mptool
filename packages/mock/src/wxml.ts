// oxlint-disable promise/prefer-await-to-callbacks
// oxlint-disable no-use-before-define -- the query object refers to itself while being built

import type { MockNodeInfo } from "./typings.js";
import {
  disconnectObserver,
  getNodeFixtures,
  registerObserver,
  takeObserverRecords,
} from "./wxmlState.js";

export interface SelectorQueryMock {
  in: (component: unknown) => SelectorQueryMock;
  select: (selector: string) => SelectorQueryMock;
  selectAll: (selector: string) => SelectorQueryMock;
  selectViewport: () => SelectorQueryMock;
  boundingClientRect: (callback?: (result: unknown) => void) => SelectorQueryMock;
  scrollOffset: (callback?: (result: unknown) => void) => SelectorQueryMock;
  fields: (fields: unknown, callback?: (result: unknown) => void) => SelectorQueryMock;
  node: (callback?: (result: unknown) => void) => SelectorQueryMock;
  context: (callback?: (result: unknown) => void) => SelectorQueryMock;
  ref: (callback?: (result: unknown) => void) => SelectorQueryMock;
  exec: (callback?: (result: unknown[]) => void) => void;
}

type NodeKind = "boundingClientRect" | "context" | "fields" | "node" | "ref" | "scrollOffset";

interface QueryNode {
  callback?: (result: unknown) => void;
  /** `fields()` specification; `{}` until that binding is selected. */
  fieldsSpec: Record<string, unknown>;
  kind?: NodeKind;
  multiple: boolean;
  selector: string;
}

const VIEWPORT_SELECTOR = "viewport";

const rectOf = (
  info: MockNodeInfo,
): {
  bottom: number;
  dataset: Record<string, unknown>;
  height: number;
  id: string;
  left: number;
  right: number;
  top: number;
  width: number;
} => {
  const left = info.left ?? 0;
  const top = info.top ?? 0;
  const width = info.width ?? 0;
  const height = info.height ?? 0;

  return {
    bottom: info.bottom ?? top + height,
    dataset: info.dataset ?? {},
    height,
    id: info.id ?? "",
    left,
    right: info.right ?? left + width,
    top,
    width,
  };
};

const scrollOffsetOf = (info: MockNodeInfo): Record<string, number> => {
  const offset: Record<string, number> = {
    scrollLeft: info.scrollLeft ?? 0,
    scrollTop: info.scrollTop ?? 0,
  };

  if (typeof info.scrollHeight === "number") offset.scrollHeight = info.scrollHeight;
  if (typeof info.scrollWidth === "number") offset.scrollWidth = info.scrollWidth;

  return offset;
};

const fieldsOf = (info: MockNodeInfo, spec: Record<string, unknown>): Record<string, unknown> => {
  const rect = rectOf(info);
  const result: Record<string, unknown> = {};

  if (spec.id === true) result.id = rect.id;
  if (spec.dataset === true) result.dataset = rect.dataset;
  if (spec.rect === true)
    result.rect = { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
  if (spec.size === true) result.size = { height: rect.height, width: rect.width };
  if (spec.scrollOffset === true) result.scrollOffset = scrollOffsetOf(info);
  if (spec.node === true) result.node = info.node ?? null;
  if (spec.context === true) result.context = info.context ?? null;
  if (spec.ref === true) result.ref = info.ref ?? null;
  if (spec.properties === true) result.properties = info.fields?.properties ?? {};

  return { ...result, ...info.fields };
};

const createSelectorQueryMock = (): SelectorQueryMock => {
  const nodes: QueryNode[] = [];
  let current: QueryNode | undefined;

  const selectNode = (selector: string, multiple: boolean): SelectorQueryMock => {
    current = { fieldsSpec: {}, multiple, selector };
    nodes.push(current);

    return query;
  };

  const bind = (kind: NodeKind, callback?: (result: unknown) => void): SelectorQueryMock => {
    if (current) {
      current.kind = kind;
      current.callback = callback;
    }

    return query;
  };

  const query: SelectorQueryMock = {
    in(): SelectorQueryMock {
      // Component-scoped fixtures share the global registry in the mock.
      return query;
    },
    select(selector: string): SelectorQueryMock {
      return selectNode(selector, false);
    },
    selectAll(selector: string): SelectorQueryMock {
      return selectNode(selector, true);
    },
    selectViewport(): SelectorQueryMock {
      return selectNode(VIEWPORT_SELECTOR, false);
    },
    boundingClientRect(callback?: (result: unknown) => void): SelectorQueryMock {
      return bind("boundingClientRect", callback);
    },
    scrollOffset(callback?: (result: unknown) => void): SelectorQueryMock {
      return bind("scrollOffset", callback);
    },
    fields(fields: unknown, callback?: (result: unknown) => void): SelectorQueryMock {
      if (current) current.fieldsSpec = (fields ?? {}) as Record<string, unknown>;
      return bind("fields", callback);
    },
    node(callback?: (result: unknown) => void): SelectorQueryMock {
      return bind("node", callback);
    },
    context(callback?: (result: unknown) => void): SelectorQueryMock {
      return bind("context", callback);
    },
    ref(callback?: (result: unknown) => void): SelectorQueryMock {
      return bind("ref", callback);
    },
    exec(callback?: (result: unknown[]) => void): void {
      setTimeout(() => {
        const results = nodes.map((node) => {
          const fixtures = getNodeFixtures(node.selector);
          const infos = node.multiple ? fixtures : fixtures.slice(0, 1);
          const values = infos.map((info) => {
            switch (node.kind) {
              case "boundingClientRect": {
                return rectOf(info);
              }
              case "scrollOffset": {
                return scrollOffsetOf(info);
              }
              case "fields": {
                return fieldsOf(info, node.fieldsSpec);
              }
              case "node": {
                return info.node ?? null;
              }
              case "context": {
                return info.context ?? null;
              }
              case "ref": {
                return info.ref ?? null;
              }
              default: {
                return null;
              }
            }
          });
          const result = node.multiple ? values : (values[0] ?? null);

          if (node.callback) node.callback(result);

          return result;
        });

        if (callback) callback(results);
      }, 0);
    },
  };

  return query;
};

export interface IntersectionObserverMock {
  relativeTo: (selector?: string, margins?: unknown) => IntersectionObserverMock;
  relativeToViewport: (margins?: unknown) => IntersectionObserverMock;
  observe: (targetSelector: string, callback: (result: unknown) => void) => void;
  disconnect: () => void;
  takeRecords: () => unknown[];
}

const createIntersectionObserverMock = (): IntersectionObserverMock => {
  const observerIds: number[] = [];
  let relativeSelector: string | null = null;

  const observer: IntersectionObserverMock = {
    relativeTo(selector?: string): IntersectionObserverMock {
      relativeSelector = selector ?? null;
      return observer;
    },
    relativeToViewport(): IntersectionObserverMock {
      relativeSelector = null;
      return observer;
    },
    observe(targetSelector: string, callback: (result: unknown) => void): void {
      observerIds.push(registerObserver(targetSelector, callback, relativeSelector));
    },
    disconnect(): void {
      for (const id of observerIds) disconnectObserver(id);
      observerIds.length = 0;
    },
    takeRecords(): unknown[] {
      return observerIds.flatMap((id) => takeObserverRecords(id));
    },
  };

  return observer;
};

/** WXML 节点查询相关 wx API mock */
export const wxmlApi = {
  createSelectorQuery(): SelectorQueryMock {
    return createSelectorQueryMock();
  },

  createIntersectionObserver(): IntersectionObserverMock {
    return createIntersectionObserverMock();
  },
};
