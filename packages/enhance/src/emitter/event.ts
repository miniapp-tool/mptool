import { $Emitter } from "./emitter";
import {
  ON_APP_LAUNCH,
  ON_APP_AWAKE,
  ON_PAGE_READY,
  ON_PAGE_UNLOAD,
} from "../constant";

import type { Emitter } from "./emitter";
import type { PageQuery } from "../page";

export type AppEventType = {
  [ON_APP_LAUNCH]: WechatMiniprogram.App.LaunchShowOption;
  [ON_APP_AWAKE]: number;
  [ON_PAGE_READY]: void;
  [ON_PAGE_UNLOAD]: void;
};

export type RouteEventType = Record<string, PageQuery>;

export const appEmitter = $Emitter<AppEventType>();

export const routeEmitter = $Emitter<RouteEventType>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserEmitter = Emitter<Record<string, any>>;

export const userEmitter: UserEmitter = $Emitter();
