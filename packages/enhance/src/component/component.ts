import { logger, wrapFunction } from "@mptool/shared";

import { getRef, removeRef, setRef } from "./store.js";
import type {
  ComponentConstructor,
  ComponentInstance,
  ComponentOptions,
  PropsOptions,
  TrivialComponentInstance,
  TrivialComponentOptions,
} from "./typings.js";
import { bind, mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import type { TrivialPageInstance } from "../page/index.js";

let componentIndex = 0;

export const handleProperties = (
  oldProps: PropsOptions = {},
): WechatMiniprogram.Component.PropertyOption => {
  const props: WechatMiniprogram.Component.PropertyOption = {};

  Object.keys(oldProps).forEach((propertyName) => {
    const advancedValue = oldProps[propertyName];

    // Constructor or null
    if (advancedValue === null || typeof advancedValue === "function") {
      props[propertyName] =
        advancedValue as WechatMiniprogram.Component.ShortProperty;
    } else {
      const { type } = advancedValue;

      // null type
      if (type === null)
        props[propertyName] = {
          type: null,
          value: advancedValue.default,
        };
      // array type, should push rest into `optionalTypes`
      else if (Array.isArray(type))
        // array type syntax
        props[propertyName] = {
          // @ts-expect-error: Force set prop config
          type: type[0],
          value: advancedValue.default,

          // @ts-expect-error: Force set prop config
          optionalTypes: type.slice(1),
        };
      else
        props[propertyName] = {
          // @ts-expect-error: Force set prop config
          type,
          value: advancedValue.default,
        };
    }
  });

  return {
    ...props,
    // add ref
    ref: { type: String, value: "" },
  };
};

/**
 * 组件注册器
 *
 * @param options 注册选项
 */
export const $Component: ComponentConstructor = <
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends PropsOptions,
  Method extends WechatMiniprogram.Component.MethodOption,
  Behavior extends WechatMiniprogram.Component.BehaviorOption,
  InstanceProps extends WechatMiniprogram.IAnyObject = Record<never, never>,
  IsPage extends boolean = false,
>(
  options: ComponentOptions<
    Data,
    Property,
    Method,
    Behavior,
    InstanceProps,
    IsPage
  >,
): string => {
  // extend page config
  const { extendComponent, injectComponent } = getConfig();

  if (extendComponent)
    extendComponent(options as unknown as TrivialComponentOptions);

  // ensure lifetimes
  if (!options.lifetimes) options.lifetimes = {};

  options.lifetimes.created = wrapFunction(
    options.lifetimes.created,
    function init(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        Behavior,
        InstanceProps,
        IsPage
      >,
    ) {
      mount(this);
      if (injectComponent)
        injectComponent(options as unknown as TrivialComponentOptions);
    },
  );

  options.lifetimes.attached = wrapFunction(
    options.lifetimes.attached,
    // set id and save ref
    function (
      this: ComponentInstance<
        Data,
        Property,
        Method,
        Behavior,
        InstanceProps,
        IsPage
      >,
    ) {
      const id = (componentIndex += 1);

      this.$id = id;
      setRef(id, this);
      this.$refID = this.properties.ref as string;

      this.triggerEvent("ing", { id: this.$id, event: "_$attached" });
    },
  );

  options.lifetimes.detached = wrapFunction(
    options.lifetimes.detached,
    // remove saved ref
    function (
      this: ComponentInstance<
        Data,
        Property,
        Method,
        Behavior,
        InstanceProps,
        IsPage
      >,
    ) {
      removeRef(this.$id);

      const $refs = this.$parent?.$refs;
      const refName = this.$refID;

      if (refName && $refs) delete $refs[refName];

      // @ts-expect-error: $parent is not optional
      delete this.$parent;
    },
  );

  // @ts-expect-error: Force adding methods
  options.methods = {
    ...options.methods,

    // inject methods

    $call(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        Behavior,
        InstanceProps,
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
        Behavior,
        InstanceProps,
        IsPage
      >,
      parent: TrivialComponentInstance | TrivialPageInstance,
    ): void {
      this.$root = (parent.$root as TrivialPageInstance) || parent;
      this.$parent = parent;
    },

    $: bind,
  };

  options.observers = {
    ...options.observers,
    // add ref observer to support dynamic ref
    ref(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        Behavior,
        InstanceProps,
        IsPage
      >,
      value: string,
    ): void {
      if (this.$refID && this.$refID !== value) {
        if (this.$parent?.$refs) delete this.$parent.$refs[this.$refID];

        this.$refID = value;
        logger.debug(`Component ${this.$id} ref: ${value}`);
      }
    },
  };

  // @ts-expect-error: convert prop config
  options.properties = handleProperties(options.props);
  delete options.props;

  // we cast properties into syntax that miniprogram can handle
  return Component(
    options as unknown as WechatMiniprogram.Component.Options<
      Data,
      WechatMiniprogram.Component.PropertyOption,
      Method,
      Behavior,
      InstanceProps,
      IsPage
    >,
  );
};
