// oxlint-disable promise/prefer-await-to-callbacks -- wx manager events use callbacks
// oxlint-disable typescript/no-explicit-any -- generic manager surface is loosely typed
// oxlint-disable typescript/no-confusing-void-expression -- eventPair returns void in concise manager methods

import { callCallback, onEvent } from "../ui.js";

const noop = (): void => void 0;

const eventPair = (
  eventName: string,
  listener: ((...args: unknown[]) => void) | undefined,
): void => {
  if (listener) onEvent(eventName, listener);
};

const createAnimation = (): Record<string, (...args: unknown[]) => unknown> => {
  const animation: Record<string, (...args: unknown[]) => unknown> = {
    export: () => ({ actions: [] }),
  };

  for (const method of [
    "backgroundColor",
    "bottom",
    "height",
    "left",
    "matrix",
    "opacity",
    "right",
    "rotate",
    "scale",
    "skew",
    "step",
    "top",
    "translate",
    "translate3d",
    "translateX",
    "translateY",
    "translateZ",
    "width",
  ])
    animation[method] = (): unknown => animation;

  return animation;
};

const createCameraContext = (): Record<string, unknown> => ({
  onCameraFrame: (callback: (frame: unknown) => void) => {
    eventPair("cameraFrame", callback);
  },
  setFocusMode: noop,
  setZoom: noop,
  startRecord: (option?: unknown) => callCallback(option, { errMsg: "startRecord:ok" }),
  stopRecord: (option?: unknown) =>
    callCallback(option, { errMsg: "stopRecord:ok", tempVideoPath: "mock://tmp/camera.mp4" }),
  takePhoto: (option?: unknown) =>
    callCallback(option, { errMsg: "takePhoto:ok", tempImagePath: "mock://tmp/camera.jpg" }),
});

const createMediaRecorder = (): Record<string, unknown> => ({
  onError: (listener?: (...args: unknown[]) => void) => eventPair("mediaRecorderError", listener),
  onPause: (listener?: () => void) => eventPair("mediaRecorderPause", listener),
  onProgress: (listener?: (...args: unknown[]) => void) =>
    eventPair("mediaRecorderProgress", listener),
  onResume: (listener?: () => void) => eventPair("mediaRecorderResume", listener),
  onStart: (listener?: () => void) => eventPair("mediaRecorderStart", listener),
  onStop: (listener?: (...args: unknown[]) => void) => eventPair("mediaRecorderStop", listener),
  onTimeUpdate: (listener?: (...args: unknown[]) => void) =>
    eventPair("mediaRecorderTimeUpdate", listener),
  pause: noop,
  resume: noop,
  start: noop,
  stop: noop,
});

const createWebAudioContext = (): Record<string, unknown> => ({
  close: noop,
  createBufferSource: () => ({ connect: noop, start: noop, stop: noop }),
  createGain: () => ({ connect: noop, gain: { value: 1 } }),
  createOscillator: () => ({
    connect: noop,
    frequency: { value: 440 },
    start: noop,
    stop: noop,
    type: "sine",
  }),
  currentTime: 0,
  decodeAudioData: (data: ArrayBuffer) => Promise.resolve(data),
  destination: {},
  resume: noop,
  state: "running",
  suspend: noop,
});

const createAudioContext = (): Record<string, unknown> => ({
  pause: noop,
  play: noop,
  seek: noop,
  setSrc: noop,
});

const createVideoDecoder = (): Record<string, unknown> => ({
  off: noop,
  on: noop,
  seek: noop,
  start: noop,
  stop: noop,
});

const createWorker = (): Record<string, unknown> => ({
  onMessage: (listener?: (...args: unknown[]) => void) => eventPair("workerMessage", listener),
  onProcessKilled: (listener?: () => void) => eventPair("workerProcessKilled", listener),
  postMessage: noop,
  terminate: noop,
});

const createOffscreenCanvas = (width?: number, height?: number): Record<string, unknown> => ({
  getContext: () => ({
    clearRect: noop,
    drawImage: noop,
    fillRect: noop,
    getImageData: () => ({ data: new Uint8ClampedArray(0), height: 0, width: 0 }),
    putImageData: noop,
  }),
  height: height ?? 0,
  width: width ?? 0,
});

const createSocket = (): Record<string, unknown> => ({
  close: noop,
  connect: noop,
  onClose: (listener?: (...args: unknown[]) => void) => eventPair("socketClose", listener),
  onConnect: (listener?: () => void) => eventPair("socketConnect", listener),
  onError: (listener?: (...args: unknown[]) => void) => eventPair("socketError", listener),
  onMessage: (listener?: (...args: unknown[]) => void) => eventPair("socketMessage", listener),
  write: noop,
});

let bufferUrlSeq = 0;

const createCacheManager = (): Record<string, unknown> => {
  const cache = new Map<string, unknown>();

  return {
    clear: () => cache.clear(),
    delete: (key: string) => cache.delete(key),
    get: (key: string) => cache.get(key),
    set: (key: string, value: unknown) => cache.set(key, value),
  };
};

const createPluginUpdateManager = (): Record<string, unknown> => ({
  applyUpdate: (): void => {
    // no-op: the plugin update lifecycle is event-driven in this stub
  },
  onCheckForUpdate: (listener?: (...args: unknown[]) => void) =>
    eventPair("pluginUpdateCheck", listener),
  onUpdateFailed: (listener?: (...args: unknown[]) => void) =>
    eventPair("pluginUpdateFailed", listener),
  onUpdateReady: (listener?: () => void) => eventPair("pluginUpdateReady", listener),
});

const createUserCryptoManager = (): Record<string, unknown> => ({
  getLatestUserKey: (option?: unknown) =>
    callCallback(option, {
      decryptKey: "mock-decrypt-key",
      encryptKey: "mock-encrypt-key",
      errMsg: "getLatestUserKey:ok",
      expireTime: 0,
      iv: "mock-iv",
      version: 1,
    }),
  getRandomValues: (option?: unknown) =>
    callCallback(option, {
      errMsg: "getRandomValues:ok",
      randomValues: new Uint8Array([0, 1, 2, 3]).buffer,
    }),
});

/** A3 manager / factory stubs (create + full method surface + event registration). */
export const managersApi: Record<string, (...args: any[]) => unknown> = {
  createAnimation,

  createCameraContext,

  createMediaRecorder,

  createWebAudioContext,

  createAudioContext,

  createVideoDecoder,

  createWorker,

  createOffscreenCanvas,

  createTCPSocket: createSocket,

  createUDPSocket: createSocket,

  createBufferURL: (): string => {
    bufferUrlSeq += 1;

    return `mock://buffer/${bufferUrlSeq}`;
  },

  revokeBufferURL: noop,

  createCacheManager,

  getPluginUpdateManager: createPluginUpdateManager,

  getUserCryptoManager: createUserCryptoManager,

  loadFontFace: (option?: unknown): unknown => callCallback(option, { errMsg: "loadFontFace:ok" }),

  loadBuiltInFontFace: (option?: unknown): unknown =>
    callCallback(option, { errMsg: "loadBuiltInFontFace:ok" }),

  preDownloadSubpackage: (option?: unknown): unknown =>
    callCallback(option, { errMsg: "preDownloadSubpackage:ok" }),

  preloadAssets: (option?: unknown): unknown =>
    callCallback(option, { errMsg: "preloadAssets:ok" }),

  preloadWebview: (option?: unknown): unknown =>
    callCallback(option, { errMsg: "preloadWebview:ok" }),

  preloadSkylineView: (option?: unknown): unknown =>
    callCallback(option, { errMsg: "preloadSkylineView:ok" }),

  openEmbeddedMiniProgram: (option?: unknown): unknown =>
    callCallback(option, { errMsg: "openEmbeddedMiniProgram:ok" }),
};
