import type { MockUiState, UserDecisions } from "./typings.js";

/** UI decisions / permission and clipboard state configured through `mockWx`. */
export interface MockUiDecisions {
  auth: Record<string, boolean>;
  authorize: "allow" | "deny";
  clipboard: string | null;
  login: { code?: string; sessionValid?: boolean };
  user: UserDecisions;
}

/** Runtime UI state used by `mockWx.ui()` and the update manager. */
export interface MockUiRuntime {
  actionSheet: { tapIndex: number } | null;
  loading: { title: string } | null;
  modal: { cancel: boolean; confirm: boolean; content?: string } | null;
  toast: { duration?: number; icon?: string; title: string } | null;
  update: {
    applied: boolean;
    checked: boolean;
    failed: string | null;
    hasUpdate: boolean;
    ready: boolean;
  };
}

const createDecisions = (): MockUiDecisions => ({
  auth: {},
  authorize: "allow",
  clipboard: null,
  login: {},
  user: {},
});

const createRuntime = (): MockUiRuntime => ({
  actionSheet: null,
  loading: null,
  modal: null,
  toast: null,
  update: {
    applied: false,
    checked: false,
    failed: null,
    hasUpdate: false,
    ready: false,
  },
});

/** Mutable decisions; read by `ui.ts` / `device.ts`. */
export const uiDecisions: MockUiDecisions = createDecisions();

/** Mutable runtime UI state. */
export const uiRuntime: MockUiRuntime = createRuntime();

/** Internal snapshot for `mockWx` scopes / reset. */
export interface UiSnapshot {
  decisions: MockUiDecisions;
  runtime: MockUiRuntime;
}

// oxlint-disable-next-line unicorn/prefer-structured-clone -- JSON round-trip keeps the ES2018 bundle free of structuredClone
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const snapshotUi = (): UiSnapshot => ({
  decisions: clone(uiDecisions),
  runtime: clone(uiRuntime),
});

export const restoreUi = (snapshot: UiSnapshot): void => {
  Object.assign(uiDecisions, clone(snapshot.decisions));
  Object.assign(uiRuntime, clone(snapshot.runtime));
};

export const resetUi = (): void => {
  Object.assign(uiDecisions, createDecisions());
  Object.assign(uiRuntime, createRuntime());
};

/** Read-only snapshot exposed through `mockWx.ui()`. */
export const getUiState = (): MockUiState => ({
  actionSheet: uiRuntime.actionSheet ? { ...uiRuntime.actionSheet } : null,
  loading: uiRuntime.loading ? { ...uiRuntime.loading } : null,
  modal: uiRuntime.modal ? { ...uiRuntime.modal } : null,
  toast: uiRuntime.toast ? { ...uiRuntime.toast } : null,
  update: { ...uiRuntime.update },
});
