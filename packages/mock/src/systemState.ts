import type { MockNetworkOptions, MockSystemOptions } from "./typings.js";

/** Mutable system / network options; written by `mockWx.system()` / `mockWx.network()`. */
export interface SystemState {
  network: MockNetworkOptions;
  system: MockSystemOptions;
}

export interface SystemSnapshot {
  network: MockNetworkOptions;
  system: MockSystemOptions;
}

const createState = (): SystemState => ({ network: {}, system: {} });

// oxlint-disable-next-line unicorn/prefer-structured-clone -- JSON round-trip keeps the ES2018 bundle free of structuredClone
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Current system / network options. */
export const systemState: SystemState = createState();

export const snapshotSystem = (): SystemSnapshot => clone(systemState);

export const restoreSystem = (snapshot: SystemSnapshot): void => {
  Object.assign(systemState, clone(snapshot));
};

export const resetSystem = (): void => {
  Object.assign(systemState, createState());
};
