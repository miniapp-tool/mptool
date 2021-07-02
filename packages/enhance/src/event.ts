import mitt from "mitt";
import { Emitter } from "mitt";

import type { PageLifecycleOptions } from "./page";

export type RootEventType = {
  "app:launch": WechatMiniprogram.App.LaunchShowOption;
  "app:show": WechatMiniprogram.App.LaunchShowOption;
  "app:sleep": number;
  "page:ready": void;
};

type PageName = string;

type PreloadEvent = `preload:${PageName}`;

type NagivateEvent = `navigate:${PageName}`;

export type RouteEventType = Record<
  PreloadEvent | NagivateEvent,
  PageLifecycleOptions
> &
  Record<string, PageLifecycleOptions>;

export const appEmitter = mitt<RootEventType>();

export const routeEmitter = mitt<RouteEventType>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserEmitter = Emitter<Record<string, any>>;

export const userEmitter: UserEmitter = mitt();
