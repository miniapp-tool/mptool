/** Serialized value; `undefined` means the value itself was `undefined`. */
export type StoredValue = string | undefined;

/** Serialized storage contents, keyed by storage key. */
export const storage: Map<string, StoredValue> = new Map<string, StoredValue>();

/** Internal snapshot of the in-memory storage; used by `mockWx` scopes. */
export type StorageSnapshot = Map<string, StoredValue>;

/** Capture the current storage contents. */
export const snapshotStorage = (): StorageSnapshot => new Map(storage);

/** Restore storage contents captured by {@link snapshotStorage}. */
export const restoreStorage = (snapshot: StorageSnapshot): void => {
  storage.clear();

  for (const [key, value] of snapshot) storage.set(key, value);
};

/** Clear all storage entries. */
export const resetStorage = (): void => {
  storage.clear();
};
