import mitt from "mitt";
import { Emitter } from "mitt";
import { PageQuery } from "./page";

export type AppEventType = {
  "app:launch": WechatMiniprogram.App.LaunchShowOption;
  "app:show": WechatMiniprogram.App.LaunchShowOption;
  "app:sleep": number;
  "page:ready": void;
};

export type RouteEventType = Record<string, PageQuery>;

export const appEmitter = mitt<AppEventType>();

export const routeEmitter = mitt<RouteEventType>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserEmitter = Emitter<Record<string, any>>;

export const userEmitter: UserEmitter = mitt();
