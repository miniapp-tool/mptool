import { mergeFun } from "@mptool/shared";
import event from "mitt";

import { bind, mount } from "../bridge";
import { getConfig } from "../config";
import { PageInstance } from "../page";
import { getRef, setRef, removeRef } from "./store";

import type {
  ComponentConstructor,
  ComponentInstance,
  ComponentOptions,
  ExtendedComponentProperty,
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

  if (extendComponent)
    extendComponent(options as UnknownComponentInstance, { event });

  // ensure lifetimes
  if (!options.lifetimes) options.lifetimes = {};

  // create 生命周期
  options.lifetimes.created = mergeFun(() => {
    mount(options);
  }, options.lifetimes.created);

  // attach生命周期
  options.lifetimes.attached = mergeFun(function (
    this: ComponentInstance<
      Data,
      Property,
      Method,
      CustomInstanceProperty,
      IsPage
    >
  ) {
    const id = (componentIndex += 1);

    // 写入id，并保存组件实例
    this.$id = id;
    setRef(id, this as UnknownComponentInstance);
    this.$refID = this.properties.ref as string;

    this.triggerEvent("ing", { id: this.$id, event: "_$attached" });
  },
  options.lifetimes.attached);

  // detached 生命周期
  options.lifetimes.detached = mergeFun(function (
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
  // 添加 ref 属性并创建监听器
  options.properties = {
    ...options.properties,
    ref: {
      type: String,
      value: "",
      observer(
        this: WechatMiniprogram.Component.FullProperty<StringConstructor> &
          ExtendedComponentProperty,
        newValue: string
      ): void {
        // 支持动态 ref
        if (this.$refID !== newValue) {
          if (this.$parent?.$refs) delete this.$parent.$refs[this.$refID];

          this.$refID = newValue;
        }
      },
    },
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

  return Component(options);
};
