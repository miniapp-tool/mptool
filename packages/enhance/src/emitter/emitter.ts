export type EventType = string | symbol;

export type Handler<T = unknown> = (event: T) => void | Promise<void>;
export type WildcardHandler<T = Record<string, unknown>> = (
  type: keyof T,
  event: T[keyof T]
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

export interface Emitter<Events extends Record<EventType, unknown>> {
  all: EventHandlerMap<Events>;

  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
  on(type: "*", handler: WildcardHandler<Events>): void;

  off<Key extends keyof Events>(
    type: Key,
    handler?: Handler<Events[Key]>
  ): void;
  off(type: "*", handler: WildcardHandler<Events>): void;

  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  emit<Key extends keyof Events>(
    type: undefined extends Events[Key] ? Key : never
  ): void;

  emitAsync<Key extends keyof Events>(
    type: Key,
    event: Events[Key]
  ): Promise<void>;
  emitAsync<Key extends keyof Events>(
    type: undefined extends Events[Key] ? Key : never
  ): Promise<void>;
}

/**
 * Mitt: Tiny (~300b) functional event emitter / pubsub.
 * @name emitter
 * @returns Emitter
 */
export default function emitter<Events extends Record<EventType, unknown>>(
  all?: EventHandlerMap<Events>
): Emitter<Events> {
  type GenericEventHandler =
    | Handler<Events[keyof Events]>
    | WildcardHandler<Events>;
  all = all || new Map();

  return {
    /**
     * A Map of event names to registered handler functions.
     */
    all,

    /**
     * Register an event handler for the given type.
     * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
     * @param {Function} handler Function to call in response to given event
     * @memberOf emitter
     */
    on<Key extends keyof Events>(
      type: Key,
      handler: GenericEventHandler
    ): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const handlers: Array<GenericEventHandler> | undefined = all!.get(type);

      if (handlers) handlers.push(handler);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      else all!.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
    },

    /**
     * Remove an event handler for the given type.
     * If `handler` is omitted, all handlers of the given type are removed.
     * @param {string|symbol} type Type of event to unregister `handler` from, or `'*'`
     * @param {Function} [handler] Handler function to remove
     * @memberOf emitter
     */
    off<Key extends keyof Events>(
      type: Key,
      handler?: GenericEventHandler
    ): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const handlers: Array<GenericEventHandler> | undefined = all!.get(type);

      if (handlers) {
        if (handler) handlers.splice(handlers.indexOf(handler) >>> 0, 1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        else all!.set(type, []);
      }
    },

    /**
     * Invoke all handlers for the given type.
     * If present, `'*'` handlers are invoked after type-matched handlers.
     *
     * Note: Manually firing '*' handlers is not supported.
     *
     * @param {string|symbol} type The event type to invoke
     * @param {Any} [event] Any value (object is recommended and powerful), passed to each handler
     * @memberOf emitter
     */
    emit<Key extends keyof Events>(type: Key, event?: Events[Key]): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      let handlers = all!.get(type);
      if (handlers) {
        (handlers as EventHandlerList<Events[keyof Events]>)
          .slice()
          .map((handler) => {
            void handler(event as Events[Key]);
          });
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handlers = all!.get("*");
      if (handlers) {
        (handlers as WildCardEventHandlerList<Events>)
          .slice()
          .map((handler) => {
            void handler(type, event as Events[Key]);
          });
      }
    },

    /**
     * Invoke all handlers for the given type asynchronously
     * If present, `'*'` handlers are invoked after type-matched handlers.
     *
     * Note: Manually firing '*' handlers is not supported.
     *
     * @param {string|symbol} type The event type to invoke
     * @param {Any} [event] Any value (object is recommended and powerful), passed to each handler
     * @memberOf emitter
     */
    emitAsync<Key extends keyof Events>(
      type: Key,
      event?: Events[Key]
    ): Promise<void> {
      return Promise.all(
        ((this.all.get(type) || []) as EventHandlerList<Events[keyof Events]>)
          .slice()
          .map((handler) => handler(event as Events[Key]))
      )
        .then(() =>
          Promise.all(
            ((this.all.get("*") || []) as WildCardEventHandlerList<Events>)
              .slice()
              .map((handler) => handler(type, event as Events[Key]))
          )
        )
        .then(() => void 0);
    },
  };
}
