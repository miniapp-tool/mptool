import type { MockIntersectionResult, MockNodeInfo, MockIntersectionRect } from "./typings.js";

export interface ObserverEntry {
  callback: (result: MockIntersectionResult) => void;
  connected: boolean;
  id: number;
  records: MockIntersectionResult[];
  relativeSelector?: string | null;
  selector: string;
}

export interface WxmlSnapshot {
  fixtures: [string, MockNodeInfo[]][];
  observers: ObserverEntry[];
}

const createNodeFixtures = (): Map<string, MockNodeInfo[]> => new Map<string, MockNodeInfo[]>();
const createObserverEntries = (): Map<number, ObserverEntry> => new Map<number, ObserverEntry>();

/** Registered node fixtures, keyed by selector. */
export const nodeFixtures: Map<string, MockNodeInfo[]> = createNodeFixtures();

/** Registered intersection observers. */
export const observerEntries: Map<number, ObserverEntry> = createObserverEntries();

let observerSeq = 0;

const emptyRect = (rect?: Partial<MockIntersectionRect>): MockIntersectionRect => ({
  bottom: rect?.bottom ?? 0,
  height: rect?.height ?? 0,
  left: rect?.left ?? 0,
  right: rect?.right ?? 0,
  top: rect?.top ?? 0,
  width: rect?.width ?? 0,
});

/** Build the default result for an intersection trigger. */
export const createIntersectionResult = (
  result: Partial<MockIntersectionResult> = {},
): MockIntersectionResult => ({
  boundingClientRect: emptyRect(result.boundingClientRect),
  intersectionRatio: result.intersectionRatio ?? 0,
  intersectionRect: emptyRect(result.intersectionRect),
  relativeRect: emptyRect(result.relativeRect),
  time: result.time ?? Date.now(),
});

/** Register (or append) a node fixture for a selector. `null` clears the selector. */
export const registerNode = (selector: string, info: MockNodeInfo | null): void => {
  if (!info) {
    nodeFixtures.delete(selector);
    return;
  }

  const fixtures = nodeFixtures.get(selector) ?? [];

  fixtures.push(info);
  nodeFixtures.set(selector, fixtures);
};

/** Read the fixtures registered for a selector. */
export const getNodeFixtures = (selector: string): MockNodeInfo[] =>
  nodeFixtures.get(selector) ?? [];

/** Register an observer entry and return its id. */
export const registerObserver = (
  selector: string,
  callback: (result: MockIntersectionResult) => void,
  relativeSelector?: string | null,
): number => {
  observerSeq += 1;

  const id = observerSeq;

  observerEntries.set(id, {
    callback,
    connected: true,
    id,
    records: [],
    relativeSelector,
    selector,
  });

  return id;
};

export const disconnectObserver = (id: number): void => {
  const entry = observerEntries.get(id);

  if (entry) entry.connected = false;
};

/** Trigger the observers watching `selector` with an intersection result. */
export const triggerIntersection = (
  selector: string,
  result: Partial<MockIntersectionResult> = {},
): void => {
  const payload = createIntersectionResult(result);

  for (const entry of observerEntries.values()) {
    if (!entry.connected || entry.selector !== selector) continue;

    entry.records.push(payload);
    setTimeout(() => {
      entry.callback(payload);
    }, 0);
  }
};

/** Read and clear pending observer records. */
export const takeObserverRecords = (id: number): MockIntersectionResult[] => {
  const entry = observerEntries.get(id);

  if (!entry) return [];

  const { records } = entry;

  entry.records = [];

  return records;
};

const cloneFixture = (fixture: MockNodeInfo): MockNodeInfo => ({ ...fixture });

const cloneObserver = (entry: ObserverEntry): ObserverEntry => ({
  ...entry,
  records: [...entry.records],
});

export const snapshotWxml = (): WxmlSnapshot => {
  const fixtures: [string, MockNodeInfo[]][] = [];
  const observers: ObserverEntry[] = [];

  for (const [selector, entries] of nodeFixtures)
    fixtures.push([selector, entries.map((fixture) => cloneFixture(fixture))]);

  for (const entry of observerEntries.values()) observers.push(cloneObserver(entry));

  return { fixtures, observers };
};

export const restoreWxml = (snapshot: WxmlSnapshot): void => {
  nodeFixtures.clear();

  for (const [selector, fixtures] of snapshot.fixtures) {
    nodeFixtures.set(
      selector,
      fixtures.map((fixture) => cloneFixture(fixture)),
    );
  }

  observerEntries.clear();

  for (const entry of snapshot.observers) observerEntries.set(entry.id, cloneObserver(entry));

  observerSeq = Math.max(observerSeq, ...snapshot.observers.map((entry) => entry.id), 0);
};

export const resetWxml = (): void => {
  nodeFixtures.clear();
  observerEntries.clear();
  observerSeq = 0;
};
