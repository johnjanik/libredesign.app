/**
 * Storage API
 *
 * Host API for plugin persistent storage using IndexedDB.
 */

import type { SerializableValue } from '../../types/serialization';
import type { StorageQuota } from '../../types/api-types';
import { serialize, estimateSize } from '../serializer';

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Default quota per plugin in bytes */
  readonly defaultQuota: number;
  /** Maximum key length */
  readonly maxKeyLength: number;
  /** Maximum value size in bytes */
  readonly maxValueSize: number;
}

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  defaultQuota: 10 * 1024 * 1024, // 10MB
  maxKeyLength: 256,
  maxValueSize: 5 * 1024 * 1024, // 5MB per value
};

/**
 * Plugin storage state
 */
interface PluginStorage {
  readonly pluginId: string;
  data: Map<string, SerializableValue>;
  quota: number;
  usedBytes: number;
}

/**
 * Create the Storage API handlers
 */
export function createStorageAPI(config: StorageConfig = DEFAULT_STORAGE_CONFIG) {
  // In-memory storage (would be backed by IndexedDB in production)
  const pluginStorages = new Map<string, PluginStorage>();

  // Get or create plugin storage
  function getPluginStorage(pluginId: string): PluginStorage {
    let storage = pluginStorages.get(pluginId);
    if (!storage) {
      storage = {
        pluginId,
        data: new Map(),
        quota: config.defaultQuota,
        usedBytes: 0,
      };
      pluginStorages.set(pluginId, storage);
    }
    return storage;
  }

  // Calculate size of a value
  function getValueSize(value: SerializableValue): number {
    return estimateSize(value);
  }

  // Validate key
  function validateKey(key: string): void {
    if (typeof key !== 'string') {
      throw new Error('Key must be a string');
    }
    if (key.length === 0) {
      throw new Error('Key cannot be empty');
    }
    if (key.length > config.maxKeyLength) {
      throw new Error(`Key too long (max ${config.maxKeyLength} characters)`);
    }
    if (!/^[\w.-]+$/.test(key)) {
      throw new Error('Key contains invalid characters (allowed: a-z, A-Z, 0-9, _, ., -)');
    }
  }

  return {
    /**
     * Get a value from storage
     */
    'storage.get': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<SerializableValue | null> => {
      const key = args[0];
      if (typeof key !== 'string') {
        throw new Error('Key must be a string');
      }
      validateKey(key);

      const storage = getPluginStorage(pluginId);
      return storage.data.get(key) ?? null;
    },

    /**
     * Set a value in storage
     */
    'storage.set': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const key = args[0];
      const value = args[1];

      if (typeof key !== 'string') {
        throw new Error('Key must be a string');
      }
      validateKey(key);

      // Serialize to ensure value is safe
      const serialized = serialize(value);
      if (!serialized.success) {
        throw new Error(`Cannot serialize value: ${serialized.error}`);
      }

      const valueSize = getValueSize(serialized.data!);
      if (valueSize > config.maxValueSize) {
        throw new Error(`Value too large (${valueSize} bytes, max ${config.maxValueSize})`);
      }

      const storage = getPluginStorage(pluginId);

      // Calculate new total size
      const existingSize = storage.data.has(key)
        ? getValueSize(storage.data.get(key)!)
        : 0;
      const newTotalSize = storage.usedBytes - existingSize + valueSize;

      if (newTotalSize > storage.quota) {
        throw new Error(
          `Storage quota exceeded (${newTotalSize} bytes, quota ${storage.quota})`
        );
      }

      // Store the value
      storage.data.set(key, serialized.data!);
      storage.usedBytes = newTotalSize;
    },

    /**
     * Delete a value from storage
     */
    'storage.delete': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const key = args[0];
      if (typeof key !== 'string') {
        throw new Error('Key must be a string');
      }
      validateKey(key);

      const storage = getPluginStorage(pluginId);

      if (!storage.data.has(key)) {
        return false;
      }

      const valueSize = getValueSize(storage.data.get(key)!);
      storage.data.delete(key);
      storage.usedBytes -= valueSize;

      return true;
    },

    /**
     * List all keys in storage
     */
    'storage.list': async (pluginId: string): Promise<string[]> => {
      const storage = getPluginStorage(pluginId);
      return Array.from(storage.data.keys());
    },

    /**
     * Get storage quota information
     */
    'storage.getQuota': async (pluginId: string): Promise<StorageQuota> => {
      const storage = getPluginStorage(pluginId);
      return {
        used: storage.usedBytes,
        total: storage.quota,
      };
    },

    /**
     * Clear all storage for a plugin
     */
    'storage.clear': async (pluginId: string): Promise<void> => {
      const storage = getPluginStorage(pluginId);
      storage.data.clear();
      storage.usedBytes = 0;
    },

    /**
     * Check if a key exists
     */
    'storage.has': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const key = args[0];
      if (typeof key !== 'string') {
        throw new Error('Key must be a string');
      }
      validateKey(key);

      const storage = getPluginStorage(pluginId);
      return storage.data.has(key);
    },

    /**
     * Get multiple values at once
     */
    'storage.getMultiple': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<Record<string, SerializableValue | null>> => {
      const keys = args[0];
      if (!Array.isArray(keys)) {
        throw new Error('Keys must be an array');
      }

      const storage = getPluginStorage(pluginId);
      const result: Record<string, SerializableValue | null> = {};

      for (const key of keys) {
        if (typeof key !== 'string') continue;
        result[key] = storage.data.get(key) ?? null;
      }

      return result;
    },

    /**
     * Set plugin quota (admin only)
     */
    _setQuota: (pluginId: string, quota: number): void => {
      const storage = getPluginStorage(pluginId);
      storage.quota = quota;
    },

    /**
     * Clean up storage for a plugin (called on uninstall)
     */
    _cleanup: (pluginId: string): void => {
      pluginStorages.delete(pluginId);
    },

    /**
     * Get all plugin storage stats (admin only)
     */
    _getStats: (): Map<string, { used: number; quota: number; keys: number }> => {
      const stats = new Map<string, { used: number; quota: number; keys: number }>();
      for (const [pluginId, storage] of pluginStorages) {
        stats.set(pluginId, {
          used: storage.usedBytes,
          quota: storage.quota,
          keys: storage.data.size,
        });
      }
      return stats;
    },
  };
}

export type StorageAPIHandlers = ReturnType<typeof createStorageAPI>;
