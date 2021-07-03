import mitt from "mitt";
import { Emitter } from "mitt";
import { ON_APP_LAUNCH, ON_APP_AWAKE, ON_PAGE_READY } from "./constant";
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
  [ON_APP_LAUNCH]: WechatMiniprogram.App.LaunchShowOption;
  [ON_APP_AWAKE]: number;
  [ON_PAGE_READY]: void;
};

export type RouteEventType = Record<string, PageQuery>;

export const $Emiiter = mitt;

export const appEmitter = mitt<AppEventType>();

export const routeEmitter = mitt<RouteEventType>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserEmitter = Emitter<Record<string, any>>;

export const userEmitter: UserEmitter = mitt();
