export * from "../../api/src/index.js";
export * from "../../enhance/src/index.js";
export * from "../../file/src/index.js";
export * from "../../net/src/index.js";
export * from "../../parser/src/index.js";

// `@mptool/enhance` 已 re-export shared 的 `Emitter`，若此处再整体透传 shared 会触发
// TS2308 重复导出，故改为显式列出 shared 的其余值/类型导出，保持 `@mptool/all` 全量导出面。
export {
  encodeBase64,
  decodeBase64,
  env,
  MpError,
  logger,
  query,
  type,
  isFunction,
  wrapFunction,
  lock,
  once,
  Queue,
  funcQueue,
  createQueue,
} from "@mptool/shared";
export type {
  Env,
  MpErrorOptions,
  Task,
  PromiseQueue,
  EventType,
  Handler,
  WildcardHandler,
  EventHandlerList,
  WildCardEventHandlerList,
  EventHandlerMap,
  EmitterInstance,
} from "@mptool/shared";
