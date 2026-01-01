/**
 * Type-safe event emitter for DesignLibre
 */
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
export class EventEmitter {
    handlers = new Map();
    anyHandlers = new Set();
    /**
     * Subscribe to an event.
     * Returns an unsubscribe function.
     */
    on(event, handler) {
        let handlers = this.handlers.get(event);
        if (!handlers) {
            handlers = new Set();
            this.handlers.set(event, handlers);
        }
        handlers.add(handler);
        return () => {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.handlers.delete(event);
            }
        };
    }
    /**
     * Subscribe to an event, automatically unsubscribe after first emission.
     */
    once(event, handler) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            handler(data);
        });
        return unsubscribe;
    }
    /**
     * Subscribe to all events.
     */
    onAny(handler) {
        this.anyHandlers.add(handler);
        return () => {
            this.anyHandlers.delete(handler);
        };
    }
    /**
     * Emit an event to all subscribers.
     */
    emit(event, ...[data]) {
        // Notify specific handlers
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(data);
                }
                catch (error) {
                    console.error(`Error in event handler for "${String(event)}":`, error);
                }
            }
        }
        // Notify any handlers
        for (const handler of this.anyHandlers) {
            try {
                handler({ type: event, data });
            }
            catch (error) {
                console.error(`Error in "any" event handler:`, error);
            }
        }
    }
    /**
     * Remove all handlers for an event.
     */
    off(event) {
        this.handlers.delete(event);
    }
    /**
     * Remove all handlers.
     */
    clear() {
        this.handlers.clear();
        this.anyHandlers.clear();
    }
    /**
     * Get the number of handlers for an event.
     */
    listenerCount(event) {
        return this.handlers.get(event)?.size ?? 0;
    }
    /**
     * Check if an event has any handlers.
     */
    hasListeners(event) {
        return this.listenerCount(event) > 0;
    }
    /**
     * Get all registered event names.
     */
    eventNames() {
        return Array.from(this.handlers.keys());
    }
}
/**
 * Create a batchable event emitter that collects events during a batch
 * and emits them all at once when the batch completes.
 */
export class BatchableEventEmitter extends EventEmitter {
    batching = false;
    batchedEvents = [];
    /**
     * Start a batch. Events emitted during the batch will be collected
     * and only dispatched when the batch ends.
     */
    startBatch() {
        this.batching = true;
    }
    /**
     * End a batch and emit all collected events.
     */
    endBatch() {
        this.batching = false;
        const events = this.batchedEvents;
        this.batchedEvents = [];
        for (const { event, data } of events) {
            super.emit(event, ...(data === undefined ? [] : [data]));
        }
    }
    /**
     * Execute a function within a batch.
     */
    batch(fn) {
        this.startBatch();
        try {
            return fn();
        }
        finally {
            this.endBatch();
        }
    }
    emit(event, ...[data]) {
        if (this.batching) {
            this.batchedEvents.push({ event, data });
        }
        else {
            super.emit(event, ...[data]);
        }
    }
}
//# sourceMappingURL=event-emitter.js.map