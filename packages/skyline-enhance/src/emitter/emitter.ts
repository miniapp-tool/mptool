import type { EmitterInstance } from "@mptool/shared";
import { Emitter } from "@mptool/shared";

import type { ON_APP_AWAKE, ON_APP_LAUNCH } from "../constant.js";

export interface AppEventType {
  [ON_APP_LAUNCH]: WechatMiniprogram.App.LaunchShowOption;
  [ON_APP_AWAKE]: number;
}

export const appEmitter = Emitter<AppEventType>();

export type UserEmitter = EmitterInstance<WechatMiniprogram.IAnyObject>;

export const userEmitter: UserEmitter = Emitter();
