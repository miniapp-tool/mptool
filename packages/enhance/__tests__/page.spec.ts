import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { ON_APP_AWAKE } from "../src/constant.js";
import { appEmitter } from "../src/emitter/index.js";
import { $Page } from "../src/page/index.js";

describe($Page, () => {
  it("should unregister onAwake listener on unload", () => {
    $Config({ defaultPage: "/pages/$name" });

    const onAwake = vi.fn<(time: number) => void>();

    let pageOptions:
      | WechatMiniprogram.Page.Options<WechatMiniprogram.IAnyObject, WechatMiniprogram.IAnyObject>
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", { onAwake });

    // 触发 onLoad，注册 onAwake 监听器
    void pageOptions?.onLoad?.({});

    appEmitter.emit(ON_APP_AWAKE, 1000);
    expect(onAwake).toHaveBeenCalledWith(1000);

    // 触发 onUnload，注销 onAwake 监听器
    void pageOptions?.onUnload?.();

    appEmitter.emit(ON_APP_AWAKE, 2000);
    expect(onAwake).toHaveBeenCalledTimes(1);
  });
});
