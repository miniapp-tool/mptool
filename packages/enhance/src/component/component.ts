import { logger } from "@mptool/shared";
import { getRef, setRef, removeRef } from "./store";
import { bind, mount } from "../bridge";
import { getConfig } from "../config";
import { PageInstance } from "../page";
import { mergeFunction } from "../utils";

import type {
  ComponentConstructor,
  ComponentInstance,
  ComponentOptions,
  UnknownComponentInstance,
} from "./typings";

let componentIndex = 0;

/**
 * 组件注册器
 *
 * @param options 注册选项
 */
export const $Component: ComponentConstructor = <
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends WechatMiniprogram.Component.PropertyOption,
  Method extends WechatMiniprogram.Component.MethodOption,
  CustomInstanceProperty extends WechatMiniprogram.IAnyObject = Record<
    string,
    never
  >,
  IsPage extends boolean = false
>(
  options: ComponentOptions<
    Data,
    Property,
    Method,
    CustomInstanceProperty,
    IsPage
  >
): string => {
  // extend page config
  const { extendComponent } = getConfig();

  if (extendComponent) extendComponent(options as UnknownComponentInstance);

  // ensure lifetimes
  if (!options.lifetimes) options.lifetimes = {};

  // create 生命周期
  options.lifetimes.created = mergeFunction(() => {
    mount(options);
  }, options.lifetimes.created);

  // attach 生命周期
  options.lifetimes.attached = mergeFunction(function (
    this: ComponentInstance<
      Data,
      Property,
      Method,
      CustomInstanceProperty,
      IsPage
    >
  ) {
    const id = (componentIndex += 1);

    // 写入 id，并保存组件实例
    this.$id = id;
    setRef(id, this as UnknownComponentInstance);
    this.$refID = this.properties.ref as string;

    this.triggerEvent("ing", { id: this.$id, event: "_$attached" });
  },
  options.lifetimes.attached);

  // detached 生命周期
  options.lifetimes.detached = mergeFunction(function (
    this: ComponentInstance<
      Data,
      Property,
      Method,
      CustomInstanceProperty,
      IsPage
    >
  ) {
    // 删除保存的组件实例
    removeRef(this.$id);

    const $refs = this.$parent?.$refs;
    const refName = this.$refID;

    if (refName && $refs) delete $refs[refName];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete this.$parent;
  },
  options.lifetimes.detached);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // add ref
  options.properties = {
    ...options.properties,
    ref: { type: String, value: "" },
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // 方法注入
  options.methods = {
    ...options.methods,
    $call(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        CustomInstanceProperty,
        IsPage
      >,
      method: string,
      ...args: any[]
    ): void {
      logger.debug(`Component ${this.$id} call ${method}:`, args);
      this.triggerEvent("ing", {
        id: this.$id,
        event: method,
        args,
      });
    },

    $getRef: getRef,

    /**
     * 由父组件调用
     *
     * @param parent 父组件
     */
    _$attached(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        CustomInstanceProperty,
        IsPage
      >,
      parent: UnknownComponentInstance | PageInstance
    ): void {
      this.$root = (parent as UnknownComponentInstance).$root || parent;
      this.$parent = parent;
    },
    $: bind,
  };

  options.observers = {
    ...(options.observers || {}),
    // add ref observer
    ref(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        CustomInstanceProperty,
        IsPage
      >,
      value: string
    ): void {
      // 支持动态 ref
      if (this.$refID && this.$refID !== value) {
        if (this.$parent?.$refs) delete this.$parent.$refs[this.$refID];

        this.$refID = value;
        logger.debug(`Component ${this.$id} ref: ${value}`);
      }
    },
  };

  return Component(options);
};
