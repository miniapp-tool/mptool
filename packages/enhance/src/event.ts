import mitt from "mitt";
import { Emitter } from "mitt";
import { PageQuery } from "./page";

export type {
  Emitter,
  EventHandlerList,
  EventHandlerMap,
  EventType,
  Handler,
  WildCardEventHandlerList,
  WildcardHandler,
} from "mitt";

export type AppEventType = {
  "app:launch": WechatMiniprogram.App.LaunchShowOption;
  "app:show": WechatMiniprogram.App.LaunchShowOption;
  "app:sleep": number;
  "page:ready": void;
};

export type RouteEventType = Record<string, PageQuery>;

export const $Emiiter = mitt;

export const appEmitter = mitt<AppEventType>();

export const routeEmitter = mitt<RouteEventType>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserEmitter = Emitter<Record<string, any>>;

export const userEmitter: UserEmitter = mitt();
