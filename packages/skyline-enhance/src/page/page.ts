import { logger, wrapFunction } from "@mptool/shared";

import { mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import { ON_APP_AWAKE } from "../constant.js";
import { appEmitter } from "../emitter/index.js";
import type { PageConstructor, PageOptions } from "./typings.js";

let shouldBeFirstPage = true;

export const $Page: PageConstructor = <
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  name: string,
  options: PageOptions<Data, Custom>,
): void => {
  const { extendPage, injectPage } = getConfig();

  const callLog = (lifeCycle: string, args?: unknown): void => {
    logger.debug(`Page ${name}: ${lifeCycle} has been invoked`, args);
  };
  const registerLog = (lifeCycle: string): void => {
    logger.debug(`Page ${name}: registered ${lifeCycle}`);
  };

  /** OnAwake 监听器，用于在页面卸载时注销 */
  let onAwakeHandler: ((time: number) => void) | undefined;

  // extend page config
  if (extendPage) extendPage(name, options);

  options.$name = name;

  options.$state = {
    /** 是否是首个启动页面 */
    firstOpen: false,
  };

  // oxlint-disable-next-line typescript/no-misused-promises
  options.onLoad = wrapFunction(options.onLoad, (): void => {
    // After onLoad, onAwake is valid if defined
    if (options.onAwake) {
      onAwakeHandler = (time: number): void => {
        callLog("onAwake");

        // oxlint-disable-next-line typescript/no-non-null-assertion
        void options.onAwake!(time);
      };
      appEmitter.on(ON_APP_AWAKE, onAwakeHandler);
      registerLog("onAwake");
    }

    if (shouldBeFirstPage) {
      shouldBeFirstPage = false;

      // oxlint-disable-next-line typescript/no-non-null-assertion
      options.$state!.firstOpen = true;
    }
  });

  // oxlint-disable-next-line typescript/no-misused-promises
  options.onUnload = wrapFunction(options.onUnload, () => {
    // 注销 onAwake 监听器，避免页面卸载后残留
    if (onAwakeHandler) {
      appEmitter.off(ON_APP_AWAKE, onAwakeHandler);

      // oxlint-disable-next-line no-undefined
      onAwakeHandler = undefined;
    }
  });

  mount(options);

  // extend page config
  if (injectPage) injectPage(name, options);

  // called before register
  if (options.onRegister) {
    callLog("onRegister");
    options.onRegister();
  }

  // register page
  Page(options as WechatMiniprogram.Page.Options<Data, Custom>);

  logger.debug(`Registered: Page ${name}`);
};
