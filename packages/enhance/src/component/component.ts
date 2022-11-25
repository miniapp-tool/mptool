import { logger, wrapFunction } from "@mptool/shared";
import { getRef, setRef, removeRef } from "./store.js";
import { bind, mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import { TrivialPageInstance } from "../page/index.js";

import type {
  ComponentConstructor,
  ComponentInstance,
  ComponentOptions,
  PropsOptions,
  TrivalComponentInstance,
  TrivalComponentOptions,
} from "./typings.js";

let componentIndex = 0;

export const handleProperties = (
  props: PropsOptions = {}
): WechatMiniprogram.Component.PropertyOption => {
  const properties: WechatMiniprogram.Component.PropertyOption = {};

  Object.keys(props).forEach((propertyName) => {
    const vueSyntaxValue = props[propertyName];

    // Constructor or null
    if (vueSyntaxValue === null || typeof vueSyntaxValue === "function")
      properties[propertyName] =
        vueSyntaxValue as WechatMiniprogram.Component.ShortProperty;
    else {
      const { type } = vueSyntaxValue;

      // null type
      if (type === null)
        properties[propertyName] = {
          type: null,
          value: vueSyntaxValue.default,
        };
      // array type, should push rest into `optionalTypes`
      else if (Array.isArray(type))
        // array type syntax
        properties[propertyName] = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          type: type[0],
          value: vueSyntaxValue.default,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          optionalTypes: type.slice(1),
        };
      else
        properties[propertyName] = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          type,
          value: vueSyntaxValue.default,
        };
    }
  });

  return {
    ...properties,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomInstanceProperty extends Record<string, any> = {},
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

  if (extendComponent)
    extendComponent(options as unknown as TrivalComponentOptions);

  // ensure lifetimes
  if (!options.lifetimes) options.lifetimes = {};

  options.lifetimes.created = wrapFunction(
    options.lifetimes.created,
    function init(
      this: ComponentInstance<
        Data,
        Property,
        Method,
        CustomInstanceProperty,
        IsPage
      >
    ) {
      mount(this);
      if (injectComponent)
        injectComponent(options as unknown as TrivalComponentOptions);
    }
  );

  options.lifetimes.attached = wrapFunction(
    options.lifetimes.attached,
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
      setRef(id, this);
      this.$refID = this.properties.ref as string;

      this.triggerEvent("ing", { id: this.$id, event: "_$attached" });
    }
  );

  options.lifetimes.detached = wrapFunction(
    options.lifetimes.detached,
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
    }
  );

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
      parent: TrivalComponentInstance | TrivialPageInstance
    ): void {
      this.$root = (parent.$root as TrivialPageInstance) || parent;
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  options.properties = handleProperties(options.properties);

  // we cast properties into syntax that miniprogram can handle
  return Component(
    options as unknown as WechatMiniprogram.Component.Options<
      Data,
      WechatMiniprogram.Component.PropertyOption,
      Method
    >
  );
};
