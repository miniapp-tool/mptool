/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InstanceEmitterMethods } from "../emitter/index.js";
import type {
  ExtendedPageMethods,
  TrivialPageInstance,
} from "../page/index.js";

export type Props = Record<string, unknown>;

export type PropsOptions<Property = Props> = {
  [K in keyof Property]: PropItem<Property[K]> | null;
};

export type PropItem<Type, Default = Type> =
  | PropOption<Type, Default>
  | PropConstructor<Type>;

export interface PropOption<Type = any, Default = Type> {
  /** 属性类型 */
  type?: PropType<Type> | null;
  /**
   * 是否必填
   *
   * @description 仅用作类型推导，无检查
   */
  required?: boolean;
  /** 属性初始值 */
  default?: Default | null | undefined | object;
}

type PropMethod<Type, TypeConstructor = any> = Type extends (
  ...args: any
) => any
  ? // if is function with args
    { new (): TypeConstructor; (): Type; readonly prototype: TypeConstructor } // Create Function like constructor
  : never;

type PropConstructor<Type = any> =
  | { new (...args: any[]): Type & {} }
  | { (): Type }
  | PropMethod<Type>;

export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

export type InferFromType<Type> = [Type] extends [null]
  ? any // null would fail to infer
  : [Type] extends [ArrayConstructor]
  ? any[]
  : [Type] extends [ObjectConstructor]
  ? Record<string, any>
  : [Type] extends [BooleanConstructor]
  ? boolean
  : [Type] extends [PropConstructor<infer V>]
  ? unknown extends V
    ? // fail to infer
      any
    : V
  : Type;

type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends { required: true } | { default: any }
    ? T[K] extends { default: undefined | (() => undefined) }
      ? never
      : K
    : never;
}[keyof T];

type OptionalKeys<Type> = Exclude<keyof Type, RequiredKeys<Type>>;

export type InferPropType<Type> = [Type] extends [null]
  ? any // null would fail to infer
  : [Type] extends [{ type: null }]
  ? any // As TS issue https://github.com/Microsoft/TypeScript/issues/14829 // somehow `ObjectConstructor` when inferred from { (): T } becomes `any` // `BooleanConstructor` when inferred from PropConstructor(with PropMethod) becomes `Boolean`
  : [Type] extends [ArrayConstructor | { type: ArrayConstructor }]
  ? any[]
  : [Type] extends [ObjectConstructor | { type: ObjectConstructor }]
  ? Record<string, any>
  : [Type] extends [BooleanConstructor | { type: BooleanConstructor }]
  ? boolean
  : [Type] extends [PropItem<infer Value, infer Default>]
  ? unknown extends Value
    ? Default
    : Value
  : Type;

export type InferPropTypes<O> = O extends object
  ? {
      [K in keyof O]?: unknown;
    } & {
      // This is needed to keep the relation between the option prop and the props, allowing to use ctrl+click to navigate to the prop options. see: #3656
      [K in RequiredKeys<O>]: InferPropType<O[K]>;
    } & { [K in OptionalKeys<O>]?: InferPropType<O[K]> }
  : { [K in string]: any };

export interface ComponentLifetimes {
  /** 组件生命周期声明对象 */
  lifetimes: Partial<{
    /**
     * 在组件实例刚刚被创建时执行，注意此时不能调用 `setData`
     *
     * 最低基础库版本：[`1.6.3`](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
     */
    created(): void;
    /**
     * 在组件实例进入页面节点树时执行
     *
     * 最低基础库版本：[`1.6.3`](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
     */
    attached(): void;
    /**
     * 在组件在视图层布局完成后执行
     *
     * 最低基础库版本：[`1.6.3`](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
     */
    ready(): void;
    /**
     * 在组件实例被移动到节点树另一个位置时执行
     *
     * 最低基础库版本：[`1.6.3`](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
     */
    moved(): void;
    /**
     * 在组件实例被从页面节点树移除时执行
     *
     * 最低基础库版本：[`1.6.3`](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
     */
    detached(): void;
    /**
     * 每当组件方法抛出错误时执行
     *
     * 最低基础库版本：[`2.4.1`](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
     */
    error(err: Error): void;
  }>;
}

export interface ExtendedComponentProperty {
  /**
   * 当前组件的唯一标识
   */
  $id: number;

  /**
   * 当前组件上用于索引的 ref ID 值
   */
  $refID: string;
  /**
   * 当前组件所属的页面组件实例
   *
   * @description 只在 `attached`, `ready` 生命周期后生效
   */
  $root: TrivialPageInstance;

  /**
   * 当前组件所属的父组件实例引用
   *
   * @description 只在 `attached`, `ready` 生命周期后生效
   */
  $parent: TrivialPageInstance | TrivalComponentInstance;

  /**
   * 指定了 `ref` 的子组件实例映射
   *
   * 示例:
   *
   * ```html
   * <custom-component binding="$" ref="customComp"/>
   * ```
   *
   * ```js
   * $Component({
   *   lifetimes:{
   *     attached() {
   *       this.$refs.customComp // 根据ref属性获取子组件的实例引用
   *     }
   *   }
   * });
   * ```
   */
  $refs: RefMap;
}

/** 组件实例 */
export interface ExtendedComponentMethods extends InstanceEmitterMethods {
  /**
   * 通过消息的方式调用父组件方法，方法不存在也不会报错
   *
   * @param method 方法名称
   * @param args 传递的参数
   */
  $call(method: string, ...args: unknown[]): void;

  /**
   * @private
   */
  _$attached(parent: TrivalComponentInstance | TrivialPageInstance): void;
}

export type ComponentInstance<
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends PropsOptions,
  Method extends Partial<WechatMiniprogram.Component.MethodOption>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomInstanceProperty extends Record<string, any> = {},
  IsPage extends boolean = false
> = WechatMiniprogram.Component.InstanceProperties &
  WechatMiniprogram.Component.InstanceMethods<Data> &
  ExtendedComponentMethods &
  Method &
  (IsPage extends true ? WechatMiniprogram.Page.ILifetime : {}) &
  CustomInstanceProperty &
  ExtendedComponentProperty &
  ExtendedPageMethods<
    Data & InferPropTypes<Property>,
    CustomInstanceProperty &
      Method &
      (IsPage extends true ? WechatMiniprogram.Page.ILifetime : {})
  > & {
    /** 组件数据，**包括内部数据和属性值** */
    data: Data & InferPropTypes<Property>;
    /** 组件数据，**包括内部数据和属性值**（与 `data` 一致） */
    properties: Data & InferPropTypes<Property>;
  };

export type ComponentOptions<
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends PropsOptions,
  Method extends WechatMiniprogram.Component.MethodOption,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomInstanceProperty extends Record<string, any> = {},
  IsPage extends boolean = false
> = Partial<WechatMiniprogram.Component.Data<Data>> &
  Partial<{
    /** 组件属性 */
    properties: Property;
  }> &
  Partial<WechatMiniprogram.Component.Method<Method, IsPage>> &
  Partial<WechatMiniprogram.Component.OtherOption> &
  Partial<ComponentLifetimes> &
  ThisType<
    ComponentInstance<Data, Property, Method, CustomInstanceProperty, IsPage>
  >;

export interface ComponentConstructor {
  <
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
  ): string;
}

export type TrivalComponentInstance = ComponentInstance<
  Record<string, any>,
  Record<string, null>,
  Record<string, (...args: unknown[]) => any>
>;

export type TrivalComponentOptions = ComponentInstance<
  Record<string, any>,
  Record<string, null>,
  Record<string, (...args: any[]) => any>
>;

export type RefMap = Record<string, TrivalComponentInstance>;
