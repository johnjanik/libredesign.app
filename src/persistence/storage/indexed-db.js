/**
 * IndexedDB Storage
 *
 * Persistent storage using IndexedDB for documents and assets.
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * IndexedDB Storage
 */
export class IndexedDBStorage extends EventEmitter {
    dbName;
    dbVersion;
    db = null;
    initPromise = null;
    constructor(options = {}) {
        super();
        this.dbName = options.dbName ?? 'designlibre-storage';
        this.dbVersion = options.dbVersion ?? 1;
    }
    /**
     * Initialize the database connection.
     */
    async initialize() {
        if (this.db)
            return;
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this.openDatabase();
        return this.initPromise;
    }
    /**
     * Check if the storage is initialized.
     */
    isInitialized() {
        return this.db !== null;
    }
    // =========================================================================
    // Document Operations
    // =========================================================================
    /**
     * Save a document.
     */
    async saveDocument(id, name, data, thumbnail) {
        await this.initialize();
        const db = this.getDb();
        const now = Date.now();
        const existing = await this.getDocumentMetadata(id);
        const doc = {
            id,
            name,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            data,
            thumbnail,
        };
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            const request = store.put(doc);
            request.onsuccess = () => {
                this.emit('document:saved', { id, name });
                resolve();
            };
            request.onerror = () => {
                const error = new Error(`Failed to save document: ${request.error?.message}`);
                this.emit('error', { error });
                reject(error);
            };
        });
    }
    /**
     * Load a document by ID.
     */
    async loadDocument(id) {
        await this.initialize();
        const db = this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');
            const request = store.get(id);
            request.onsuccess = () => {
                const doc = request.result;
                if (doc) {
                    this.emit('document:loaded', { id, name: doc.name });
                }
                resolve(doc ?? null);
            };
            request.onerror = () => {
                const error = new Error(`Failed to load document: ${request.error?.message}`);
                this.emit('error', { error });
                reject(error);
            };
        });
    }
    /**
     * Delete a document by ID.
     */
    async deleteDocument(id) {
        await this.initialize();
        const db = this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            const request = store.delete(id);
            request.onsuccess = () => {
                this.emit('document:deleted', { id });
                resolve();
            };
            request.onerror = () => {
                const error = new Error(`Failed to delete document: ${request.error?.message}`);
                this.emit('error', { error });
                reject(error);
            };
        });
    }
    /**
     * Get document metadata by ID.
     */
    async getDocumentMetadata(id) {
        const doc = await this.loadDocument(id);
        if (!doc)
            return null;
        return {
            id: doc.id,
            name: doc.name,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            thumbnail: doc.thumbnail,
        };
    }
    /**
     * List all documents.
     */
    async listDocuments() {
        await this.initialize();
        const db = this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');
            const request = store.getAll();
            request.onsuccess = () => {
                const docs = request.result;
                const metadata = docs.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    thumbnail: doc.thumbnail,
                }));
                // Sort by updatedAt descending
                metadata.sort((a, b) => b.updatedAt - a.updatedAt);
                resolve(metadata);
            };
            request.onerror = () => {
                const error = new Error(`Failed to list documents: ${request.error?.message}`);
                this.emit('error', { error });
                reject(error);
            };
        });
    }
    // =========================================================================
    // Asset Operations
    // =========================================================================
    /**
     * Save an asset (image, font, etc).
     */
    async saveAsset(id, data) {
        await this.initialize();
        const db = this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['assets'], 'readwrite');
            const store = transaction.objectStore('assets');
            const request = store.put({
                id,
                data,
                createdAt: Date.now(),
            });
            request.onsuccess = () => resolve();
            request.onerror = () => {
                reject(new Error(`Failed to save asset: ${request.error?.message}`));
            };
        });
    }
    /**
     * Load an asset by ID.
     */
    async loadAsset(id) {
        await this.initialize();
        const db = this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['assets'], 'readonly');
            const store = transaction.objectStore('assets');
            const request = store.get(id);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result?.data ?? null);
            };
            request.onerror = () => {
                reject(new Error(`Failed to load asset: ${request.error?.message}`));
            };
        });
    }
    /**
     * Delete an asset by ID.
     */
    async deleteAsset(id) {
        await this.initialize();
        const db = this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['assets'], 'readwrite');
            const store = transaction.objectStore('assets');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => {
                reject(new Error(`Failed to delete asset: ${request.error?.message}`));
            };
        });
    }
    // =========================================================================
    // Database Management
    // =========================================================================
    /**
     * Clear all data.
     */
    async clearAll() {
        await this.initialize();
        const db = this.getDb();
        const stores = ['documents', 'assets'];
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }
    /**
     * Close the database connection.
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onerror = () => {
                const error = new Error(`Failed to open database: ${request.error?.message}`);
                this.emit('error', { error });
                reject(error);
            };
        });
    }
    createStores(db) {
        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
            const docStore = db.createObjectStore('documents', { keyPath: 'id' });
            docStore.createIndex('name', 'name', { unique: false });
            docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        // Assets store (images, fonts, etc.)
        if (!db.objectStoreNames.contains('assets')) {
            db.createObjectStore('assets', { keyPath: 'id' });
        }
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
}
/**
 * Create an IndexedDB storage instance.
 */
export function createIndexedDBStorage(options) {
    return new IndexedDBStorage(options);
}
//# sourceMappingURL=indexed-db.js.map