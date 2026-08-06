// oxlint-disable promise/prefer-await-to-callbacks

export interface SelectorQueryMock {
  in: (component: unknown) => SelectorQueryMock;
  select: (selector: string) => SelectorQueryMock;
  selectAll: (selector: string) => SelectorQueryMock;
  selectViewport: () => SelectorQueryMock;
  boundingClientRect: (callback?: (result: unknown) => void) => SelectorQueryMock;
  scrollOffset: (callback?: (result: unknown) => void) => SelectorQueryMock;
  fields: (fields: unknown, callback?: (result: unknown) => void) => SelectorQueryMock;
  exec: (callback?: (result: unknown[]) => void) => void;
}

/** 简化版 SelectorQuery mock：exec 时以 null 结果触发各节点回调 */
const createSelectorQueryMock = (): SelectorQueryMock => {
  const nodes: { callback?: (result: unknown) => void }[] = [];
  let current: { callback?: (result: unknown) => void } | undefined;

  const query: SelectorQueryMock = {
    in(): SelectorQueryMock {
      return query;
    },
    select(): SelectorQueryMock {
      current = {};
      nodes.push(current);

      return query;
    },
    selectAll(): SelectorQueryMock {
      current = {};
      nodes.push(current);

      return query;
    },
    selectViewport(): SelectorQueryMock {
      current = {};
      nodes.push(current);

      return query;
    },
    boundingClientRect(callback?: (result: unknown) => void): SelectorQueryMock {
      if (current && callback) current.callback = callback;

      return query;
    },
    scrollOffset(callback?: (result: unknown) => void): SelectorQueryMock {
      if (current && callback) current.callback = callback;

      return query;
    },
    fields(_fields: unknown, callback?: (result: unknown) => void): SelectorQueryMock {
      if (current && callback) current.callback = callback;

      return query;
    },
    exec(callback?: (result: unknown[]) => void): void {
      const result = nodes.map((node) => {
        node.callback?.(null);

        return null;
      });

      if (callback) callback(result);
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

/** 简化版 IntersectionObserver mock：observe 时不触发回调，仅保证不报错 */
const createIntersectionObserverMock = (): IntersectionObserverMock => {
  const observer: IntersectionObserverMock = {
    relativeTo(): IntersectionObserverMock {
      return observer;
    },
    relativeToViewport(): IntersectionObserverMock {
      return observer;
    },
    observe(): void {
      // noop
    },
    disconnect(): void {
      // noop
    },
    takeRecords(): unknown[] {
      return [];
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
