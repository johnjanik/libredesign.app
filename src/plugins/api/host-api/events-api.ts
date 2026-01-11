/**
 * Events API
 *
 * Host API for subscribing to application events.
 */

import type { SerializableValue } from '../../types/serialization';

/**
 * Event types that plugins can subscribe to
 */
export type PluginEventType =
  | 'selection:changed'
  | 'document:changed'
  | 'node:created'
  | 'node:updated'
  | 'node:deleted'
  | 'viewport:changed'
  | 'page:changed'
  | 'tool:changed'
  | 'history:changed';

/**
 * Event listener registration
 */
export interface EventListener {
  readonly listenerId: string;
  readonly pluginId: string;
  readonly eventType: PluginEventType;
  readonly callbackId: string;
  readonly createdAt: number;
}

/**
 * Event emitter interface for sending events to plugins
 */
export interface EventEmitterAdapter {
  /** Subscribe to an event */
  subscribe(eventType: string, callback: (data: unknown) => void): string;
  /** Unsubscribe from an event */
  unsubscribe(listenerId: string): boolean;
}

/**
 * Generate a unique listener ID
 */
function generateListenerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `listener_${timestamp}_${random}`;
}

/**
 * Allowed event types for subscription
 */
const ALLOWED_EVENTS = new Set<PluginEventType>([
  'selection:changed',
  'document:changed',
  'node:created',
  'node:updated',
  'node:deleted',
  'viewport:changed',
  'page:changed',
  'tool:changed',
  'history:changed',
]);

/**
 * Create the Events API handlers
 */
export function createEventsAPI(
  adapter: EventEmitterAdapter,
  sendEventToPlugin: (pluginId: string, callbackId: string, data: SerializableValue) => void
) {
  // Track listeners per plugin
  const pluginListeners = new Map<string, Map<string, EventListener>>();

  // Get or create plugin listener map
  function getPluginListeners(pluginId: string): Map<string, EventListener> {
    let listeners = pluginListeners.get(pluginId);
    if (!listeners) {
      listeners = new Map();
      pluginListeners.set(pluginId, listeners);
    }
    return listeners;
  }

  return {
    /**
     * Subscribe to an event
     */
    'events.on': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<string> => {
      const eventType = args[0] as PluginEventType;
      const callbackId = args[1];

      if (typeof eventType !== 'string') {
        throw new Error('Event type must be a string');
      }

      if (!ALLOWED_EVENTS.has(eventType)) {
        throw new Error(`Unknown event type: ${eventType}`);
      }

      if (typeof callbackId !== 'string') {
        throw new Error('Callback ID must be a string');
      }

      // Check listener limit per plugin
      const listeners = getPluginListeners(pluginId);
      if (listeners.size >= 100) {
        throw new Error('Maximum event listeners exceeded (100)');
      }

      const listenerId = generateListenerId();

      // Subscribe to the adapter
      adapter.subscribe(eventType, (data) => {
        sendEventToPlugin(pluginId, callbackId, data as SerializableValue);
      });

      // Track the listener
      const listener: EventListener = {
        listenerId,
        pluginId,
        eventType,
        callbackId,
        createdAt: Date.now(),
      };
      listeners.set(listenerId, listener);

      return listenerId;
    },

    /**
     * Unsubscribe from an event
     */
    'events.off': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const listenerId = args[0];

      if (typeof listenerId !== 'string') {
        throw new Error('Listener ID must be a string');
      }

      const listeners = getPluginListeners(pluginId);
      const listener = listeners.get(listenerId);

      if (!listener) {
        return false;
      }

      // Verify ownership
      if (listener.pluginId !== pluginId) {
        throw new Error('Cannot remove listener owned by another plugin');
      }

      // Unsubscribe from adapter
      adapter.unsubscribe(listenerId);

      // Remove from tracking
      listeners.delete(listenerId);

      return true;
    },

    /**
     * Get all listeners for this plugin
     */
    'events.getListeners': async (pluginId: string): Promise<string[]> => {
      const listeners = getPluginListeners(pluginId);
      return Array.from(listeners.keys());
    },

    /**
     * Remove all listeners for this plugin
     */
    'events.removeAll': async (pluginId: string): Promise<number> => {
      const listeners = getPluginListeners(pluginId);
      const count = listeners.size;

      for (const [listenerId] of listeners) {
        adapter.unsubscribe(listenerId);
      }

      listeners.clear();
      return count;
    },

    /**
     * Get available event types
     */
    'events.getAvailableTypes': async (): Promise<string[]> => {
      return Array.from(ALLOWED_EVENTS);
    },

    /**
     * Clean up all listeners for a plugin (called on unload)
     */
    _cleanup: (pluginId: string): void => {
      const listeners = pluginListeners.get(pluginId);
      if (listeners) {
        for (const [listenerId] of listeners) {
          adapter.unsubscribe(listenerId);
        }
        pluginListeners.delete(pluginId);
      }
    },
  };
}

export type EventsAPIHandlers = ReturnType<typeof createEventsAPI>;
