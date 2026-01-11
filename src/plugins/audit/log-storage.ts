/**
 * Log Storage
 *
 * Provides persistent storage for audit logs with circular buffer
 * and efficient retrieval.
 */

import type { AuditLogEntry, AuditLogFilter } from './audit-logger';

/**
 * Storage backend interface
 */
export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * IndexedDB storage backend
 */
export class IndexedDBBackend implements StorageBackend {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName: string;

  constructor(dbName: string = 'designlibre-audit-logs', storeName: string = 'logs') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<string | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async set(key: string, value: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async keys(): Promise<string[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * In-memory storage backend (for testing or non-persistent mode)
 */
export class MemoryBackend implements StorageBackend {
  private readonly store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Log chunk (stored unit)
 */
interface LogChunk {
  readonly id: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly entries: AuditLogEntry[];
  readonly pluginIds: string[];
}

/**
 * Chunk index entry
 */
interface ChunkIndex {
  readonly id: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly entryCount: number;
  readonly pluginIds: string[];
}

/**
 * Log storage configuration
 */
export interface LogStorageConfig {
  /** Maximum entries per chunk */
  readonly entriesPerChunk: number;
  /** Maximum total chunks to retain */
  readonly maxChunks: number;
  /** Retention period in milliseconds */
  readonly retentionPeriod: number;
  /** Auto-flush interval in milliseconds */
  readonly flushInterval: number;
  /** Enable persistence */
  readonly persistent: boolean;
}

/**
 * Default log storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: LogStorageConfig = {
  entriesPerChunk: 1000,
  maxChunks: 100,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  flushInterval: 30000, // 30 seconds
  persistent: true,
};

/**
 * Log Storage class
 */
export class LogStorage {
  private readonly config: LogStorageConfig;
  private readonly backend: StorageBackend;
  private chunkIndex: ChunkIndex[] = [];
  private currentChunk: AuditLogEntry[] = [];
  private currentChunkStart: number = Date.now();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;

  constructor(
    config: LogStorageConfig = DEFAULT_STORAGE_CONFIG,
    backend?: StorageBackend
  ) {
    this.config = config;
    this.backend = backend ?? (config.persistent ? new IndexedDBBackend() : new MemoryBackend());
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Load chunk index
    const indexData = await this.backend.get('chunk-index');
    if (indexData) {
      try {
        this.chunkIndex = JSON.parse(indexData);
      } catch {
        this.chunkIndex = [];
      }
    }

    // Start auto-flush timer
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(() => {
          // Ignore flush errors
        });
      }, this.config.flushInterval);
    }

    this.initialized = true;
  }

  /**
   * Append a log entry
   */
  async append(entry: AuditLogEntry): Promise<void> {
    await this.init();

    this.currentChunk.push(entry);

    // Check if chunk is full
    if (this.currentChunk.length >= this.config.entriesPerChunk) {
      await this.flush();
    }
  }

  /**
   * Append multiple entries
   */
  async appendBatch(entries: AuditLogEntry[]): Promise<void> {
    await this.init();

    for (const entry of entries) {
      this.currentChunk.push(entry);

      if (this.currentChunk.length >= this.config.entriesPerChunk) {
        await this.flush();
      }
    }
  }

  /**
   * Flush current chunk to storage
   */
  async flush(): Promise<void> {
    if (this.currentChunk.length === 0) return;

    const now = Date.now();
    const chunkId = `chunk_${now.toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    // Create chunk
    const pluginIds = [...new Set(this.currentChunk.map((e) => e.pluginId))];
    const chunk: LogChunk = {
      id: chunkId,
      startTime: this.currentChunkStart,
      endTime: now,
      entries: [...this.currentChunk],
      pluginIds,
    };

    // Store chunk
    await this.backend.set(`chunk:${chunkId}`, JSON.stringify(chunk));

    // Update index
    this.chunkIndex.push({
      id: chunkId,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      entryCount: chunk.entries.length,
      pluginIds,
    });

    // Enforce max chunks
    await this.enforceRetention();

    // Save index
    await this.backend.set('chunk-index', JSON.stringify(this.chunkIndex));

    // Reset current chunk
    this.currentChunk = [];
    this.currentChunkStart = now;
  }

  /**
   * Query logs with filtering
   */
  async query(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    await this.init();

    // Get relevant chunks
    const relevantChunks = this.chunkIndex.filter((chunk) => {
      // Time range filter
      if (filter.since !== undefined && chunk.endTime < filter.since) {
        return false;
      }
      if (filter.until !== undefined && chunk.startTime > filter.until) {
        return false;
      }
      // Plugin filter
      if (filter.pluginId && !chunk.pluginIds.includes(filter.pluginId)) {
        return false;
      }
      return true;
    });

    // Sort chunks by time (newest first for efficient limit)
    relevantChunks.sort((a, b) => b.endTime - a.endTime);

    // Collect entries
    let entries: AuditLogEntry[] = [];

    // Include current chunk first
    entries.push(...this.filterEntries(this.currentChunk, filter));

    // Load and filter chunks
    for (const chunkIndex of relevantChunks) {
      const chunkData = await this.backend.get(`chunk:${chunkIndex.id}`);
      if (!chunkData) continue;

      try {
        const chunk: LogChunk = JSON.parse(chunkData);
        entries.push(...this.filterEntries(chunk.entries, filter));

        // Early exit if we have enough entries
        if (filter.limit !== undefined && entries.length >= (filter.offset ?? 0) + filter.limit) {
          break;
        }
      } catch {
        // Skip corrupted chunks
      }
    }

    // Sort all entries by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (filter.offset !== undefined) {
      entries = entries.slice(filter.offset);
    }
    if (filter.limit !== undefined) {
      entries = entries.slice(0, filter.limit);
    }

    return entries;
  }

  /**
   * Get total entry count
   */
  async getEntryCount(): Promise<number> {
    await this.init();

    let count = this.currentChunk.length;
    for (const chunk of this.chunkIndex) {
      count += chunk.entryCount;
    }
    return count;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalChunks: number;
    currentChunkSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    pluginIds: string[];
  }> {
    await this.init();

    const allPluginIds = new Set<string>();
    for (const chunk of this.chunkIndex) {
      for (const id of chunk.pluginIds) {
        allPluginIds.add(id);
      }
    }
    for (const entry of this.currentChunk) {
      allPluginIds.add(entry.pluginId);
    }

    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    if (this.chunkIndex.length > 0) {
      oldestEntry = Math.min(...this.chunkIndex.map((c) => c.startTime));
      newestEntry = Math.max(...this.chunkIndex.map((c) => c.endTime));
    }

    if (this.currentChunk.length > 0) {
      const firstEntry = this.currentChunk[0];
      const lastEntry = this.currentChunk[this.currentChunk.length - 1];
      if (firstEntry && lastEntry) {
        const currentOldest = firstEntry.timestamp;
        const currentNewest = lastEntry.timestamp;

        if (oldestEntry === null || currentOldest < oldestEntry) {
          oldestEntry = currentOldest;
        }
        if (newestEntry === null || currentNewest > newestEntry) {
          newestEntry = currentNewest;
        }
      }
    }

    return {
      totalEntries: await this.getEntryCount(),
      totalChunks: this.chunkIndex.length,
      currentChunkSize: this.currentChunk.length,
      oldestEntry,
      newestEntry,
      pluginIds: Array.from(allPluginIds),
    };
  }

  /**
   * Delete logs for a plugin
   */
  async deleteForPlugin(pluginId: string): Promise<number> {
    await this.init();

    let deleted = 0;

    // Remove from current chunk
    const beforeCount = this.currentChunk.length;
    this.currentChunk = this.currentChunk.filter((e) => e.pluginId !== pluginId);
    deleted += beforeCount - this.currentChunk.length;

    // Process stored chunks
    const newIndex: ChunkIndex[] = [];

    for (const chunkIndex of this.chunkIndex) {
      if (!chunkIndex.pluginIds.includes(pluginId)) {
        // Chunk doesn't have this plugin's logs
        newIndex.push(chunkIndex);
        continue;
      }

      // Load and filter chunk
      const chunkData = await this.backend.get(`chunk:${chunkIndex.id}`);
      if (!chunkData) continue;

      try {
        const chunk: LogChunk = JSON.parse(chunkData);
        const filteredEntries = chunk.entries.filter((e) => e.pluginId !== pluginId);
        deleted += chunk.entries.length - filteredEntries.length;

        if (filteredEntries.length > 0) {
          // Update chunk
          const updatedChunk: LogChunk = {
            ...chunk,
            entries: filteredEntries,
            pluginIds: [...new Set(filteredEntries.map((e) => e.pluginId))],
          };
          await this.backend.set(`chunk:${chunkIndex.id}`, JSON.stringify(updatedChunk));
          newIndex.push({
            ...chunkIndex,
            entryCount: filteredEntries.length,
            pluginIds: updatedChunk.pluginIds,
          });
        } else {
          // Delete empty chunk
          await this.backend.delete(`chunk:${chunkIndex.id}`);
        }
      } catch {
        // Skip corrupted chunks
      }
    }

    this.chunkIndex = newIndex;
    await this.backend.set('chunk-index', JSON.stringify(this.chunkIndex));

    return deleted;
  }

  /**
   * Delete logs older than a timestamp
   */
  async deleteOlderThan(timestamp: number): Promise<number> {
    await this.init();

    let deleted = 0;

    // Remove from current chunk
    const beforeCount = this.currentChunk.length;
    this.currentChunk = this.currentChunk.filter((e) => e.timestamp >= timestamp);
    deleted += beforeCount - this.currentChunk.length;

    // Process stored chunks
    const newIndex: ChunkIndex[] = [];

    for (const chunkIndex of this.chunkIndex) {
      if (chunkIndex.endTime < timestamp) {
        // Entire chunk is old, delete it
        await this.backend.delete(`chunk:${chunkIndex.id}`);
        deleted += chunkIndex.entryCount;
        continue;
      }

      if (chunkIndex.startTime >= timestamp) {
        // Entire chunk is new, keep it
        newIndex.push(chunkIndex);
        continue;
      }

      // Chunk spans the timestamp, need to filter
      const chunkData = await this.backend.get(`chunk:${chunkIndex.id}`);
      if (!chunkData) continue;

      try {
        const chunk: LogChunk = JSON.parse(chunkData);
        const filteredEntries = chunk.entries.filter((e) => e.timestamp >= timestamp);
        deleted += chunk.entries.length - filteredEntries.length;

        if (filteredEntries.length > 0) {
          const firstFiltered = filteredEntries[0];
          const updatedChunk: LogChunk = {
            ...chunk,
            entries: filteredEntries,
            startTime: firstFiltered ? firstFiltered.timestamp : chunk.startTime,
            pluginIds: [...new Set(filteredEntries.map((e) => e.pluginId))],
          };
          await this.backend.set(`chunk:${chunkIndex.id}`, JSON.stringify(updatedChunk));
          newIndex.push({
            ...chunkIndex,
            entryCount: filteredEntries.length,
            startTime: updatedChunk.startTime,
            pluginIds: updatedChunk.pluginIds,
          });
        } else {
          await this.backend.delete(`chunk:${chunkIndex.id}`);
        }
      } catch {
        // Skip corrupted chunks
      }
    }

    this.chunkIndex = newIndex;
    await this.backend.set('chunk-index', JSON.stringify(this.chunkIndex));

    return deleted;
  }

  /**
   * Clear all logs
   */
  async clearAll(): Promise<void> {
    await this.init();

    // Delete all chunks
    for (const chunkIndex of this.chunkIndex) {
      await this.backend.delete(`chunk:${chunkIndex.id}`);
    }

    // Clear index
    this.chunkIndex = [];
    await this.backend.set('chunk-index', JSON.stringify(this.chunkIndex));

    // Clear current chunk
    this.currentChunk = [];
    this.currentChunkStart = Date.now();
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    // Flush any remaining entries
    await this.flush();

    // Stop timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Close backend if needed
    if (this.backend instanceof IndexedDBBackend) {
      this.backend.close();
    }
  }

  /**
   * Filter entries by filter criteria
   */
  private filterEntries(entries: AuditLogEntry[], filter: AuditLogFilter): AuditLogEntry[] {
    return entries.filter((entry) => {
      if (filter.pluginId && entry.pluginId !== filter.pluginId) {
        return false;
      }
      if (filter.category && entry.category !== filter.category) {
        return false;
      }
      if (filter.action && entry.action !== filter.action) {
        return false;
      }
      if (filter.result && entry.result !== filter.result) {
        return false;
      }
      if (filter.since !== undefined && entry.timestamp < filter.since) {
        return false;
      }
      if (filter.until !== undefined && entry.timestamp > filter.until) {
        return false;
      }
      return true;
    });
  }

  /**
   * Enforce retention policy
   */
  private async enforceRetention(): Promise<void> {
    // Remove chunks beyond max
    while (this.chunkIndex.length > this.config.maxChunks) {
      const oldest = this.chunkIndex.shift();
      if (oldest) {
        await this.backend.delete(`chunk:${oldest.id}`);
      }
    }

    // Remove chunks older than retention period
    const cutoff = Date.now() - this.config.retentionPeriod;
    const oldChunks = this.chunkIndex.filter((c) => c.endTime < cutoff);

    for (const chunk of oldChunks) {
      await this.backend.delete(`chunk:${chunk.id}`);
    }

    this.chunkIndex = this.chunkIndex.filter((c) => c.endTime >= cutoff);
  }
}
