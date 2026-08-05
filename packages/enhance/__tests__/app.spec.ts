import { frameworkApi } from "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $App, appState } from "../src/app/index.js";
import { ON_APP_AWAKE } from "../src/constant.js";
import { appEmitter } from "../src/emitter/index.js";

describe($App, () => {
  it("should register app options", () => {
    $App({});

    expect(frameworkApi.app).toBeDefined();
  });

  it("should set launch state on onLaunch", () => {
    $App({});

    const app = frameworkApi.app as WechatMiniprogram.App.Options<WechatMiniprogram.IAnyObject>;

    app.onLaunch?.({
      path: "/pages/main",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    } as WechatMiniprogram.App.LaunchShowOption);

    expect(appState.launch).toBe(true);
  });

  it("should register onAwake listener", () => {
    const onAwake = vi.fn<(time: number) => void>();

    $App({ onAwake });

    appEmitter.emit(ON_APP_AWAKE, 1000);

    expect(onAwake).toHaveBeenCalledWith(1000);
  });
});
