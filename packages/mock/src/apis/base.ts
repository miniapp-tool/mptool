// oxlint-disable promise/prefer-await-to-callbacks -- wx callbacks use success/fail

import { buildSystemInfo } from "../systemInfo.js";
import { systemState } from "../systemState.js";
import { callCallback } from "../ui.js";

const idleCallbacks = new Map<number, ReturnType<typeof setTimeout>>();
let idleCallbackSeq = 0;

const DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.30";

interface PerformanceLike {
  createObserver: (callback: (...args: unknown[]) => unknown) => {
    disconnect: () => void;
    observe: () => void;
  };
  getEntries: () => Record<string, unknown>[];
  getEntriesByName: (name: string, entryType?: string) => Record<string, unknown>[];
  getEntriesByType: (entryType: string) => Record<string, unknown>[];
  now: () => number;
  setBufferSize: (size: number) => void;
  timeOrigin: number;
}

const createPerformance = (): PerformanceLike => {
  const entries: Record<string, unknown>[] = [];
  let bufferSize = 30;

  return {
    createObserver: () => ({
      disconnect: (): void => void 0,
      observe: (): void => void 0,
    }),
    getEntries: () => entries.slice(0, bufferSize),
    getEntriesByName: (name: string, entryType = "") => {
      const targetType = entryType ?? "";

      return entries.filter(
        (entry) => entry.name === name && (!targetType || entry.entryType === targetType),
      );
    },
    getEntriesByType: (entryType: string) =>
      entries.filter((entry) => entry.entryType === entryType),
    now: () => Date.now(),
    setBufferSize: (size: number): void => {
      bufferSize = size;
    },
    timeOrigin: Date.now(),
  };
};

/** Base64 / random / system-config / performance / page APIs (A2 batch 1). */
export const baseApi = {
  arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";

    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary);
  },

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

    return bytes.buffer;
  },

  getRandomValues<T extends ArrayBufferView>(array: T): T {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);

    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);

    return array;
  },

  getSystemInfoAsync(option?: unknown): unknown {
    return callCallback(option, { ...buildSystemInfo(), errMsg: "getSystemInfoAsync:ok" });
  },

  getSkylineInfo(option?: unknown): unknown {
    return callCallback(option, {
      ...(systemState.system.skyline ?? { isSupported: true, version: "0.9.7" }),
      errMsg: "getSkylineInfo:ok",
    });
  },

  getSkylineInfoSync(): Record<string, unknown> {
    return { ...(systemState.system.skyline ?? { isSupported: true, version: "0.9.7" }) };
  },

  getApiCategory(): string {
    return systemState.system.apiCategory ?? "default";
  },

  getDeviceBenchmarkInfo(option?: unknown): unknown {
    return callCallback(option, {
      benchmarkLevel: systemState.system.benchmark?.benchmarkLevel ?? 0,
      modelLevel: systemState.system.benchmark?.modelLevel ?? 0,
      errMsg: "getDeviceBenchmarkInfo:ok",
    });
  },

  // oxlint-disable-next-line promise-function-async -- wx.getRendererUserAgent is Promise-shaped without async work
  getRendererUserAgent(): Promise<string> {
    return Promise.resolve(systemState.system.rendererUserAgent ?? DEFAULT_UA);
  },

  getCommonConfig(option?: { mode?: number }): unknown {
    return callCallback(option, {
      conf: "{}",
      conf_type: 2,
      errcode: 0,
      errmsg: "ok",
      expire_sec: 0,
      errMsg: "getCommonConfig:ok",
    });
  },

  getExtConfig(option?: unknown): unknown {
    return callCallback(option, {
      extConfig: systemState.system.extConfig ?? {},
      errMsg: "getExtConfig:ok",
    });
  },

  getExtConfigSync(): Record<string, unknown> {
    return { ...systemState.system.extConfig };
  },

  getPerformance(): PerformanceLike {
    return createPerformance();
  },

  reportPerformance(_id: number, _value: number, _dimensions?: string | string[]): void {
    // The mock records no perf entries; the call is a no-op.
  },

  reportMonitor(_name: string, _value: number): void {
    // The mock records no monitor metrics; the call is a no-op.
  },

  requestIdleCallback(
    callback: (result: { errMsg: string; timeRemaining: () => number }) => void,
    option?: { timeout?: number },
  ): number {
    idleCallbackSeq += 1;

    const id = idleCallbackSeq;
    const timer = setTimeout(() => {
      idleCallbacks.delete(id);
      callback({ errMsg: "requestIdleCallback:ok", timeRemaining: () => 0 });
    }, option?.timeout ?? 0);

    idleCallbacks.set(id, timer);

    return id;
  },

  cancelIdleCallback(id: number): void {
    const timer = idleCallbacks.get(id);

    if (timer) clearTimeout(timer);
    idleCallbacks.delete(id);
  },

  enableAlertBeforeUnload(option?: unknown): unknown {
    return callCallback(option, { errMsg: "enableAlertBeforeUnload:ok" });
  },

  disableAlertBeforeUnload(option?: unknown): unknown {
    return callCallback(option, { errMsg: "disableAlertBeforeUnload:ok" });
  },

  showNavigationBarLoading(option?: unknown): unknown {
    return callCallback(option, { errMsg: "showNavigationBarLoading:ok" });
  },

  hideNavigationBarLoading(option?: unknown): unknown {
    return callCallback(option, { errMsg: "hideNavigationBarLoading:ok" });
  },

  startPullDownRefresh(option?: unknown): unknown {
    return callCallback(option, { errMsg: "startPullDownRefresh:ok" });
  },

  setTopBarText(option?: unknown): unknown {
    return callCallback(option, { errMsg: "setTopBarText:ok" });
  },

  rewriteRoute(option?: unknown): unknown {
    return callCallback(option, { errMsg: "rewriteRoute:ok" });
  },
};
