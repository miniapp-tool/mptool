import { Emitter } from "@mptool/shared";
import { ON_APP_LAUNCH, ON_APP_AWAKE } from "../constant.js";

import type { EmitterInstance } from "@mptool/shared";

export type AppEventType = {
  [ON_APP_LAUNCH]: WechatMiniprogram.App.LaunchShowOption;
  [ON_APP_AWAKE]: number;
};

export const appEmitter = Emitter<AppEventType>();

export type UserEmitter = EmitterInstance<WechatMiniprogram.IAnyObject>;

export const userEmitter: UserEmitter = Emitter();
