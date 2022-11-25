import type { UserEmitter } from "./emitter.js";

export interface InstanceEmitterMethods {
  /**
   * 事件名到处理函数的映射
   * @memberOf [Emitter](https://miniapp-tool.github.io/api/enhance/emitter.html) 实例
   */
  $all: UserEmitter["all"];
  /**
   * 为特定事件类型注册处理函数
   *
   * @param type 监听的事件类型，使用 `'*'` 监听所有事件
   * @param handler 待添加的响应函数
   * @memberOf [Emitter](https://miniapp-tool.github.io/api/enhance/emitter.html) 实例
   */
  $on: UserEmitter["on"];
  /**
   * 从特定事件类型移除指定监听器
   *
   * 如果省略 `handler`，给定类型的所有事件均被忽略
   *
   * @param {string|symbol} type 取消监听的事件类型，使用 `'*'` 取消监听所有事件
   * @param {Function} [handler] 待移除的响应函数
   * @memberOf [Emitter](https://miniapp-tool.github.io/api/enhance/emitter.html) 实例
   */
  $off: UserEmitter["off"];
  /**
   * 调用所有给定事件类型的响应函数
   *
   * 如果存在，`'*'` 响应函数会在符合事件类型的响应函数之后调用
   *
   * 注意，手动调用 `'*'` 事件不被支持
   *
   * @param type 待触发的事件类型
   * @param event 传递给所有响应函数的事件
   * @memberOf [Emitter](https://miniapp-tool.github.io/api/enhance/emitter.html) 实例
   */
  $emit: UserEmitter["emit"];
  /**
   * 异步调用所有给定事件类型的响应函数
   *
   * 所有响应函数将被并行调用。
   *
   * 如果存在，`'*'` 响应函数会在符合事件类型的响应函数之后并行调用
   *
   * 注意，手动调用 `'*'` 事件不被支持
   *
   * @param type 待触发的事件类型
   * @param event 传递给所有响应函数的事件
   * @memberOf [Emitter](https://miniapp-tool.github.io/api/enhance/emitter.html) 实例
   */
  $emitAsync: UserEmitter["emitAsync"];
}
