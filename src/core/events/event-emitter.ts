/**
 * Type-safe event emitter for DesignLibre
 */

/** Event handler type */
export type EventHandler<T = unknown> = (event: T) => void;

/** Unsubscribe function */
export type Unsubscribe = () => void;

/**
 * Type-safe event emitter.
 *
 * Usage:
 * ```ts
 * interface MyEvents {
 *   'user:login': { userId: string };
 *   'user:logout': undefined;
 *   'data:changed': { key: string; value: unknown };
 * }
 *
 * const emitter = new EventEmitter<MyEvents>();
 *
 * emitter.on('user:login', (event) => {
 *   console.log(event.userId); // Type-safe!
 * });
 *
 * emitter.emit('user:login', { userId: '123' });
 * ```
 */
export class EventEmitter<TEvents extends Record<string, unknown>> {
  private handlers = new Map<keyof TEvents, Set<EventHandler<unknown>>>();
  private anyHandlers = new Set<EventHandler<{ type: keyof TEvents; data: unknown }>>();

  /**
   * Subscribe to an event.
   * Returns an unsubscribe function.
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    let handlers = this.handlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(event, handlers);
    }

    handlers.add(handler as EventHandler<unknown>);

    return () => {
      handlers!.delete(handler as EventHandler<unknown>);
      if (handlers!.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event, automatically unsubscribe after first emission.
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      handler(data);
    });
    return unsubscribe;
  }

  /**
   * Subscribe to all events.
   */
  onAny(
    handler: EventHandler<{ type: keyof TEvents; data: unknown }>
  ): Unsubscribe {
    this.anyHandlers.add(handler);
    return () => {
      this.anyHandlers.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<K extends keyof TEvents>(
    event: K,
    ...[data]: TEvents[K] extends undefined ? [] : [TEvents[K]]
  ): void {
    // Notify specific handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      }
    }

    // Notify any handlers
    for (const handler of this.anyHandlers) {
      try {
        handler({ type: event, data });
      } catch (error) {
        console.error(`Error in "any" event handler:`, error);
      }
    }
  }

  /**
   * Remove all handlers for an event.
   */
  off<K extends keyof TEvents>(event: K): void {
    this.handlers.delete(event);
  }

  /**
   * Remove all handlers.
   */
  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }

  /**
   * Get the number of handlers for an event.
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Check if an event has any handlers.
   */
  hasListeners<K extends keyof TEvents>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get all registered event names.
   */
  eventNames(): (keyof TEvents)[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Create a batchable event emitter that collects events during a batch
 * and emits them all at once when the batch completes.
 */
export class BatchableEventEmitter<
  TEvents extends Record<string, unknown>,
> extends EventEmitter<TEvents> {
  private batching = false;
  private batchedEvents: Array<{
    event: keyof TEvents;
    data: unknown;
  }> = [];

  /**
   * Start a batch. Events emitted during the batch will be collected
   * and only dispatched when the batch ends.
   */
  startBatch(): void {
    this.batching = true;
  }

  /**
   * End a batch and emit all collected events.
   */
  endBatch(): void {
    this.batching = false;
    const events = this.batchedEvents;
    this.batchedEvents = [];

    for (const { event, data } of events) {
      super.emit(
        event,
        ...(data === undefined ? [] : [data]) as TEvents[keyof TEvents] extends undefined ? [] : [TEvents[keyof TEvents]]
      );
    }
  }

  /**
   * Execute a function within a batch.
   */
  batch<T>(fn: () => T): T {
    this.startBatch();
    try {
      return fn();
    } finally {
      this.endBatch();
    }
  }

  override emit<K extends keyof TEvents>(
    event: K,
    ...[data]: TEvents[K] extends undefined ? [] : [TEvents[K]]
  ): void {
    if (this.batching) {
      this.batchedEvents.push({ event, data });
    } else {
      super.emit(event, ...[data] as TEvents[K] extends undefined ? [] : [TEvents[K]]);
    }
  }
}
