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
  const { extendComponent, injectComponent } = getConfig();

  if (extendComponent) extendComponent(options as UnknownComponentInstance);

  // ensure lifetimes
  if (!options.lifetimes) options.lifetimes = {};

  options.lifetimes.created = mergeFunction(() => {
    mount(options);
    if (injectComponent) injectComponent(options as UnknownComponentInstance);
  }, options.lifetimes.created);

  options.lifetimes.attached = mergeFunction(
    // set id and save ref
    function (
      this: ComponentInstance<
        Data,
        Property,
        Method,
        CustomInstanceProperty,
        IsPage
      >
    ) {
      const id = (componentIndex += 1);

      this.$id = id;
      setRef(id, this as UnknownComponentInstance);
      this.$refID = this.properties.ref as string;

      this.triggerEvent("ing", { id: this.$id, event: "_$attached" });
    },
    options.lifetimes.attached
  );

  options.lifetimes.detached = mergeFunction(
    // remove saved ref
    function (
      this: ComponentInstance<
        Data,
        Property,
        Method,
        CustomInstanceProperty,
        IsPage
      >
    ) {
      removeRef(this.$id);

      const $refs = this.$parent?.$refs;
      const refName = this.$refID;

      if (refName && $refs) delete $refs[refName];

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete this.$parent;
    },
    options.lifetimes.detached
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  options.properties = {
    ...options.properties,
    // add ref
    ref: { type: String, value: "" },
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  options.methods = {
    ...options.methods,

    // inject methods
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

    // Setting $root and $parent, called by parent
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
    // add ref observer to support dynamic ref
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
      if (this.$refID && this.$refID !== value) {
        if (this.$parent?.$refs) delete this.$parent.$refs[this.$refID];

        this.$refID = value;
        logger.debug(`Component ${this.$id} ref: ${value}`);
      }
    },
  };

  return Component(options);
};
