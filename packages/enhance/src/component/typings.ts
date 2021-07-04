import type { ExtendedPageMethods, TrivialPageInstance } from "../page";

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
   * 当前组件引用的 ref id
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
export interface ExtendedComponentMethods {
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
  Property extends WechatMiniprogram.Component.PropertyOption,
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
    Data & WechatMiniprogram.Component.PropertyOptionToData<Property>,
    CustomInstanceProperty &
      Method &
      (IsPage extends true ? WechatMiniprogram.Page.ILifetime : {})
  > & {
    /** 组件数据，**包括内部数据和属性值** */
    data: Data & WechatMiniprogram.Component.PropertyOptionToData<Property>;
    /** 组件数据，**包括内部数据和属性值**（与 `data` 一致） */
    properties: Data &
      WechatMiniprogram.Component.PropertyOptionToData<Property>;
  };

export type ComponentOptions<
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends WechatMiniprogram.Component.PropertyOption,
  Method extends WechatMiniprogram.Component.MethodOption,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomInstanceProperty extends Record<string, any> = {},
  IsPage extends boolean = false
> = Partial<WechatMiniprogram.Component.Data<Data>> &
  Partial<WechatMiniprogram.Component.Property<Property>> &
  Partial<WechatMiniprogram.Component.Method<Method, IsPage>> &
  Partial<WechatMiniprogram.Component.OtherOption> &
  Partial<ComponentLifetimes> &
  ThisType<
    ComponentInstance<Data, Property, Method, CustomInstanceProperty, IsPage>
  >;

export interface ComponentConstructor {
  <
    Data extends WechatMiniprogram.Component.DataOption,
    Property extends WechatMiniprogram.Component.PropertyOption,
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
  Record<string, unknown>,
  Record<string, WechatMiniprogram.Component.AllProperty>,
  Record<string, (...args: unknown[]) => unknown | undefined>
>;

export type TrivalComponentOptions = ComponentInstance<
  Record<string, unknown>,
  Record<string, WechatMiniprogram.Component.AllProperty>,
  Record<string, (...args: unknown[]) => unknown | undefined>
>;

export type RefMap = Record<string, TrivalComponentInstance>;
