import { logger, wrapFunction } from "@mptool/shared";

import { mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import { ON_APP_AWAKE } from "../constant.js";
import { appEmitter } from "../emitter/index.js";
import type { PageConstructor, PageInstance, PageOptions } from "./typings.js";

let shouldBeFirstPage = true;

/** 页面实例到其 onAwake 监听器的映射，按实例隔离，避免多实例共享闭包 */
const onAwakeHandlers = new WeakMap<object, (time: number) => void>();

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

  // extend page config
  if (extendPage) extendPage(name, options);

  options.$name = name;

  options.$state = {
    /** 是否是首个启动页面 */
    firstOpen: false,
  };

  /* oxlint-disable typescript/no-misused-promises */
  options.onLoad = wrapFunction(
    options.onLoad,
    function handleOnLoad(this: PageInstance<Data, Custom>): void {
      // After onLoad, onAwake is valid if defined
      if (options.onAwake) {
        const onAwakeHandler = (time: number): void => {
          callLog("onAwake");

          // oxlint-disable-next-line typescript/no-non-null-assertion
          void options.onAwake!(time);
        };

        onAwakeHandlers.set(this, onAwakeHandler);
        appEmitter.on(ON_APP_AWAKE, onAwakeHandler);
        registerLog("onAwake");
      }

      if (shouldBeFirstPage) {
        shouldBeFirstPage = false;

        // oxlint-disable-next-line typescript/no-non-null-assertion
        options.$state!.firstOpen = true;
      }
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

  /* oxlint-disable typescript/no-misused-promises */
  options.onUnload = wrapFunction(
    options.onUnload,
    function handleOnUnload(this: PageInstance<Data, Custom>): void {
      // 注销 onAwake 监听器，避免页面卸载后残留
      const onAwakeHandler = onAwakeHandlers.get(this);

      if (onAwakeHandler) {
        appEmitter.off(ON_APP_AWAKE, onAwakeHandler);
        onAwakeHandlers.delete(this);
      }
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

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
