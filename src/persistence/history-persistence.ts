/**
 * History Persistence Service
 *
 * Saves and loads version history to/from IndexedDB.
 */

import type { Checkpoint, StateSnapshot, SerializedHistory, SerializedOperationGroup } from '@core/types/history';
import type { OperationGroup } from '@operations/undo-manager';

/**
 * Database configuration
 */
const DB_NAME = 'designlibre-history';
const DB_VERSION = 1;
const STORE_HISTORY = 'history';
const STORE_SNAPSHOTS = 'snapshots';

/**
 * History persistence service
 */
export class HistoryPersistenceService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open history database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create history store
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: 'documentId' });
        }

        // Create snapshots store
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
          snapshotStore.createIndex('documentId', 'documentId', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save history for a document
   */
  async saveHistory(
    documentId: string,
    undoStack: readonly OperationGroup[],
    redoStack: readonly OperationGroup[],
    checkpoints: Checkpoint[]
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const serializedHistory: SerializedHistory & { documentId: string; updatedAt: number } = {
      documentId,
      undoStack: undoStack.map(g => this.serializeOperationGroup(g)),
      redoStack: redoStack.map(g => this.serializeOperationGroup(g)),
      checkpoints,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_HISTORY], 'readwrite');
      const store = transaction.objectStore(STORE_HISTORY);

      const request = store.put(serializedHistory);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load history for a document
   */
  async loadHistory(documentId: string): Promise<SerializedHistory | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_HISTORY], 'readonly');
      const store = transaction.objectStore(STORE_HISTORY);

      const request = store.get(documentId);

      request.onsuccess = () => {
        const result = request.result as (SerializedHistory & { documentId: string }) | undefined;
        if (result) {
          resolve({
            undoStack: result.undoStack,
            redoStack: result.redoStack,
            checkpoints: result.checkpoints,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear history for a document
   */
  async clearHistory(documentId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_HISTORY, STORE_SNAPSHOTS], 'readwrite');

      // Delete history
      const historyStore = transaction.objectStore(STORE_HISTORY);
      historyStore.delete(documentId);

      // Delete associated snapshots
      const snapshotStore = transaction.objectStore(STORE_SNAPSHOTS);
      const index = snapshotStore.index('documentId');
      const cursorRequest = index.openCursor(IDBKeyRange.only(documentId));

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Save a snapshot
   */
  async saveSnapshot(
    documentId: string,
    snapshotId: string,
    snapshot: StateSnapshot
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SNAPSHOTS], 'readwrite');
      const store = transaction.objectStore(STORE_SNAPSHOTS);

      const request = store.put({
        id: snapshotId,
        documentId,
        snapshot,
        createdAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load a snapshot
   */
  async loadSnapshot(snapshotId: string): Promise<StateSnapshot | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = transaction.objectStore(STORE_SNAPSHOTS);

      const request = store.get(snapshotId);

      request.onsuccess = () => {
        const result = request.result as { snapshot: StateSnapshot } | undefined;
        resolve(result?.snapshot ?? null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load all snapshots for a document
   */
  async loadSnapshots(documentId: string): Promise<Map<string, StateSnapshot>> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = transaction.objectStore(STORE_SNAPSHOTS);
      const index = store.index('documentId');

      const snapshots = new Map<string, StateSnapshot>();
      const cursorRequest = index.openCursor(IDBKeyRange.only(documentId));

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          const data = cursor.value as { id: string; snapshot: StateSnapshot };
          snapshots.set(data.id, data.snapshot);
          cursor.continue();
        } else {
          resolve(snapshots);
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SNAPSHOTS], 'readwrite');
      const store = transaction.objectStore(STORE_SNAPSHOTS);

      const request = store.delete(snapshotId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all document IDs with saved history
   */
  async getDocumentIds(): Promise<string[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_HISTORY], 'readonly');
      const store = transaction.objectStore(STORE_HISTORY);

      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Serialize an operation group for storage
   */
  private serializeOperationGroup(group: OperationGroup): SerializedOperationGroup {
    return {
      id: group.id,
      description: group.description,
      timestamp: group.timestamp,
      // Store operations as-is, they will be serialized by JSON.stringify
      operations: group.operations.map(op => ({ ...op })),
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

/**
 * Create a history persistence service
 */
export function createHistoryPersistenceService(): HistoryPersistenceService {
  return new HistoryPersistenceService();
}

// Singleton instance
let persistenceInstance: HistoryPersistenceService | null = null;

/**
 * Get the global history persistence service
 */
export function getHistoryPersistenceService(): HistoryPersistenceService {
  if (!persistenceInstance) {
    persistenceInstance = new HistoryPersistenceService();
  }
  return persistenceInstance;
}
