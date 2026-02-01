import { logger, wrapFunction } from "@mptool/shared";

import type { PageConstructor, PageOptions } from "./typings.js";
import { mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import { ON_APP_AWAKE } from "../constant.js";
import { appEmitter } from "../emitter/index.js";

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
      appEmitter.on(ON_APP_AWAKE, (time: number) => {
        callLog("onAwake");

        // oxlint-disable-next-line typescript/no-non-null-assertion
        void options.onAwake!(time);
      });
      registerLog("onAwake");
    }

    if (shouldBeFirstPage) {
      shouldBeFirstPage = false;

      // oxlint-disable-next-line typescript/no-non-null-assertion
      options.$state!.firstOpen = true;
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
