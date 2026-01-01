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
export declare class EventEmitter<TEvents extends Record<string, unknown>> {
    private handlers;
    private anyHandlers;
    /**
     * Subscribe to an event.
     * Returns an unsubscribe function.
     */
    on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe;
    /**
     * Subscribe to an event, automatically unsubscribe after first emission.
     */
    once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe;
    /**
     * Subscribe to all events.
     */
    onAny(handler: EventHandler<{
        type: keyof TEvents;
        data: unknown;
    }>): Unsubscribe;
    /**
     * Emit an event to all subscribers.
     */
    emit<K extends keyof TEvents>(event: K, ...[data]: TEvents[K] extends undefined ? [] : [TEvents[K]]): void;
    /**
     * Remove all handlers for an event.
     */
    off<K extends keyof TEvents>(event: K): void;
    /**
     * Remove all handlers.
     */
    clear(): void;
    /**
     * Get the number of handlers for an event.
     */
    listenerCount<K extends keyof TEvents>(event: K): number;
    /**
     * Check if an event has any handlers.
     */
    hasListeners<K extends keyof TEvents>(event: K): boolean;
    /**
     * Get all registered event names.
     */
    eventNames(): (keyof TEvents)[];
}
/**
 * Create a batchable event emitter that collects events during a batch
 * and emits them all at once when the batch completes.
 */
export declare class BatchableEventEmitter<TEvents extends Record<string, unknown>> extends EventEmitter<TEvents> {
    private batching;
    private batchedEvents;
    /**
     * Start a batch. Events emitted during the batch will be collected
     * and only dispatched when the batch ends.
     */
    startBatch(): void;
    /**
     * End a batch and emit all collected events.
     */
    endBatch(): void;
    /**
     * Execute a function within a batch.
     */
    batch<T>(fn: () => T): T;
    emit<K extends keyof TEvents>(event: K, ...[data]: TEvents[K] extends undefined ? [] : [TEvents[K]]): void;
}
//# sourceMappingURL=event-emitter.d.ts.map