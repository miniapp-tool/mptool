export * from "@mptool/shared";
export { $App } from "./app";
export { $Config } from "./config";
export { $Component } from "./component";
export { userEmitter as emitter } from "./emitter";
export { $Page } from "./page";

export type {
  Emitter,
  EventHandlerList,
  EventHandlerMap,
  EventType,
  Handler,
  WildCardEventHandlerList,
  WildcardHandler,
} from "@mptool/shared";
export type {
  AppConstructor,
  AppInstance,
  AppOptions,
  ExtendsAppOptions,
  ExtendedAppMethods,
} from "./app";
export type { AppConfig } from "./config";
export {
  ComponentConstructor,
  ComponentInstance,
  ComponentOptions,
  ComponentLifetimes,
  ExtendedComponentProperty,
  ExtendedComponentMethods,
  TrivalComponentInstance,
  TrivalComponentOptions,
  RefMap,
  PropType,
} from "./component";
export type {
  PageConstructor,
  PageOptions,
  PageInstance,
  PageQuery,
  PageState,
  TrivalPageOptions,
  TrivialPageInstance,
} from "./page";
