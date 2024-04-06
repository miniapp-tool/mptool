export type EventType = string | symbol;

export type Handler<T = unknown> = (event: T) => void | Promise<void>;
export type WildcardHandler<T = Record<string, unknown>> = (
  type: keyof T,
  event: T[keyof T],
) => void | Promise<void>;

// An array of all currently registered event handlers for a type
export type EventHandlerList<T = unknown> = Array<Handler<T>>;
export type WildCardEventHandlerList<T = Record<string, unknown>> = Array<
  WildcardHandler<T>
>;

// A map of event types and their corresponding event handlers.
export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
  keyof Events | "*",
  EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

export interface EmitterInstance<Events extends Record<EventType, unknown>> {
  all: EventHandlerMap<Events>;

  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
  on(type: "*", handler: WildcardHandler<Events>): void;

  off<Key extends keyof Events>(
    type: Key,
    handler?: Handler<Events[Key]>,
  ): void;
  off(type: "*", handler: WildcardHandler<Events>): void;

  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  emit<Key extends keyof Events>(
    type: undefined extends Events[Key] ? Key : never,
  ): void;

  emitAsync<Key extends keyof Events>(
    type: Key,
    event: Events[Key],
  ): Promise<void>;
  emitAsync<Key extends keyof Events>(
    type: undefined extends Events[Key] ? Key : never,
  ): Promise<void>;
}

/**
 * Tiny (~300b) functional event emitter / pubsub.
 * @name emitter
 * @returns Emitter
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Emitter<Events extends Record<EventType, unknown>>(
  all?: EventHandlerMap<Events>,
): EmitterInstance<Events> {
  type GenericEventHandler =
    | Handler<Events[keyof Events]>
    | WildcardHandler<Events>;
  all = all || new Map();

  return {
    /**
     * 事件名到处理函数的映射
     * @memberOf emitter
     */
    all,

    /**
     * 为特定事件类型注册处理函数
     *
     * @param type 监听的事件类型，使用 `'*'` 监听所有事件
     * @param handler 待添加的响应函数
     * @memberOf emitter
     */
    on: <Key extends keyof Events>(
      type: Key,
      handler: GenericEventHandler,
    ): void => {
      const handlers: Array<GenericEventHandler> | undefined = all.get(type);

      if (handlers) handlers.push(handler);
      else all.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
    },

    /**
     * 从特定事件类型移除指定监听器
     *
     * 如果省略 `handler`，给定类型的所有事件均被忽略
     *
     * @param {string|symbol} type 取消监听的事件类型，使用 `'*'` 取消监听所有事件
     * @param {Function} [handler] 待移除的响应函数
     * @memberOf emitter
     */
    off: <Key extends keyof Events>(
      type: Key,
      handler?: GenericEventHandler,
    ): void => {
      const handlers: Array<GenericEventHandler> | undefined = all.get(type);

      if (handlers)
        if (handler) handlers.splice(handlers.indexOf(handler) >>> 0, 1);
        else all.set(type, []);
    },

    /**
     * 调用所有给定事件类型的响应函数
     *
     * 如果存在，`'*'` 响应函数会在符合事件类型的响应函数之后调用
     *
     * 注意，手动调用 `'*'` 事件不被支持
     *
     * @param type 待触发的事件类型
     * @param event 传递给所有响应函数的事件
     * @memberOf emitter
     */
    emit: <Key extends keyof Events>(type: Key, event?: Events[Key]): void => {
      let handlers = all.get(type);

      if (handlers)
        (handlers as EventHandlerList<Events[keyof Events]>)
          .slice()
          .map((handler) => {
            void handler(event as Events[Key]);
          });

      handlers = all.get("*");

      if (handlers)
        (handlers as WildCardEventHandlerList<Events>)
          .slice()
          .map((handler) => {
            void handler(type, event as Events[Key]);
          });
    },

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
     * @memberOf emitter
     */
    emitAsync: <Key extends keyof Events>(
      type: Key,
      event?: Events[Key],
    ): Promise<void> =>
      Promise.all(
        ((all.get(type) || []) as EventHandlerList<Events[keyof Events]>)
          .slice()
          .map((handler) => handler(event as Events[Key])),
      )
        .then(() =>
          Promise.all(
            ((all.get("*") || []) as WildCardEventHandlerList<Events>)
              .slice()
              .map((handler) => handler(type, event as Events[Key])),
          ),
        )
        .then(() => void 0),
  };
}
