/** 页面跳转 API */
export interface NavigatorMethods {
  /**
   * 导航到指定页面
   *
   * 本函数是 `wx.navigateTo` 的封装，`pageName` 可以带上 `queryString`
   *
   * @param pageName 页面名称或页面的路径
   *
   * 示例：
   *
   * ```js
   * this.$go('play?vid=xxx&cid=xxx');
   * ```
   */
  $go(
    pageName: string,
  ): Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;

  /**
   * 跳转到指定页面, **替换页面，不产生历史**
   *
   * 本函数是 `wx.redirectTo` 的封装，`pageName` 可以带上 `queryString`
   *
   * @param pageName 页面名称或页面的路径
   *
   * 示例：
   *
   * ```js
   * this.$redirect('about');
   * ```
   */

  $redirect(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;

  /**
   * 跳转到指定 tabBar 页面，并关闭其他所有非 tabBar 页面
   *
   * 本函数是 `wx.switchTab` 的封装，路径参数只用于触发 `onNavigate`
   *
   * @param pageName 页面名称或页面的路径
   *
   * 示例：
   *
   * ```js
   * this.$switch('main?user=mrhope');
   * ```
   */
  $switch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;

  /**
   * 关闭所有页面，之后打开到应用内的某个页面
   *
   * 本函数是 `wx.reLaunch` 的封装，`pageName` 可以带上 `queryString`
   *
   * @param pageName 页面名称或页面的路径
   *
   * 示例：
   *
   * ```js
   * this.$launch('main');
   * ```
   */
  $reLaunch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;

  /**
   * 返回上一页，`wx.navigateBack` 的封装
   *
   * @param delta 返回的层数，默认为 `1`
   *
   * 示例：
   *
   * ```js
   * this.$back();
   * this.$back(2);
   * ```
   */
  $back(delta?: number): Promise<WechatMiniprogram.GeneralCallbackResult>;

  /**
   * 提前预加载指定页面 (会触发对应页面的 `onPreload` 生命周期)
   *
   * @param pageName 页面名称或页面的路径，可以带上 `queryString`
   *
   * 示例：
   *
   * ```js
   * this.$preload('main?id=xxx&target=xxx');
   * this.$preload('/page/main?userName=xxx&action=xxx');
   * ```
   */
  $preload(pageName: string): void | Promise<void>;

  /**
   * 点击代理方法，绑定 `$go` 逻辑
   *
   * 在元素上声明 `data-url` 作为跳转地址，支持切面方法：
   *
   * - `data-before` 跳转前执行
   * - `data-after`  跳转后执行
   *
   * 示例：
   *
   * ```html
   * <button
   *   catch:tap="$bindGo"
   *   data-url="/pages/play"
   *   data-before="onClickBefore"
   * >click go</button>
   * ```
   */
  $bindGo(event: WechatMiniprogram.Touch): void | Promise<void>;

  /**
   * 点击代理方法，绑定 `$redirect` 逻辑
   *
   * 你需要在元素上声明 `data-url` 作为跳转地址，同时支持切面方法：
   *
   * - `data-before` 跳转前执行
   * - `data-after`  跳转后执行
   *
   * 示例：
   *
   * ```html
   * <button
   *   catch:tap="$bindRedirect"
   *   data-url="/pages/play"
   *   data-before="onClickBefore"
   * >click redirect</button>
   * ```
   */
  $bindRedirect(event: WechatMiniprogram.Touch): void | Promise<void>;

  /**
   * 点击代理方法，绑定 `$switch` 逻辑
   *
   * 你需要在元素上声明 `data-url` 作为跳转地址，同时支持切面方法：
   *
   * - `data-before` 跳转前执行
   * - `data-after`  跳转后执行
   *
   * 示例：
   *
   * ```html
   * <button
   *   catch:tap="$bindSwitch"
   *   data-url="/pages/play"
   *   data-before="onClickBefore"
   * >click switch</button>
   * ```
   */
  $bindSwitch(event: WechatMiniprogram.Touch): void | Promise<void>;

  /**
   * 点击代理方法，绑定 `$reLaunch` 逻辑。
   *
   * 你需要在元素上声明 `data-url` 作为跳转地址，同时支持切面方法：
   *
   * - `data-before` 跳转前执行
   * - `data-after`  跳转后执行
   *
   * 示例:
   *
   * ```html
   * <button
   *   catch:tap="$bindReLaunch"
   *   data-url="/pages/play"
   *   data-before="onClickBefore"
   * >click relaunch</button>
   * ```
   */
  $bindRelaunch(event: WechatMiniprogram.Touch): void | Promise<void>;

  /**
   * 点击代理方法，绑定 `$back` 逻辑
   * 你可以在元素上声明 `data-delta` 作为回退层数
   *
   * - `data-before` 跳转前执行
   * - `data-after`  跳转后执行
   *
   * 示例:
   *
   * ```html
   * <button
   *   catch:tap="$bindBack"
   *   data-delta="1"
   *   data-before="onClickBefore"
   * >click relaunch</button>
   * ```
   */
  $bindBack(): Promise<void> | void;
}
