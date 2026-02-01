import type { EmitterInstance } from "@mptool/shared";
import { Emitter } from "@mptool/shared";

import type { ON_APP_AWAKE, ON_APP_LAUNCH, ON_PAGE_READY, ON_PAGE_UNLOAD } from "../constant.js";
import type { PageQuery } from "../page/index.js";

export interface AppEventType {
  [ON_APP_LAUNCH]: WechatMiniprogram.App.LaunchShowOption;
  [ON_APP_AWAKE]: number;
  [ON_PAGE_READY]: void;
  [ON_PAGE_UNLOAD]: void;
}

export type RouteEventType = Record<string, PageQuery>;

export const appEmitter = Emitter<AppEventType>();

export const routeEmitter = Emitter<RouteEventType>();

export type UserEmitter = EmitterInstance<WechatMiniprogram.IAnyObject>;

export const userEmitter: UserEmitter = Emitter();
