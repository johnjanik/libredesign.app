/**
 * IndexedDB Storage
 *
 * Persistent storage using IndexedDB for documents and assets.
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Storage events
 */
export type StorageEvents = {
    'document:saved': {
        id: string;
        name: string;
    };
    'document:loaded': {
        id: string;
        name: string;
    };
    'document:deleted': {
        id: string;
    };
    'error': {
        error: Error;
    };
    [key: string]: unknown;
};
/**
 * Stored document metadata
 */
export interface DocumentMetadata {
    readonly id: string;
    readonly name: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly thumbnail?: string | undefined;
}
/**
 * Stored document
 */
export interface StoredDocument {
    readonly id: string;
    readonly name: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly data: string;
    readonly thumbnail?: string | undefined;
}
/**
 * Storage options
 */
export interface StorageOptions {
    /** Database name */
    dbName?: string | undefined;
    /** Database version */
    dbVersion?: number | undefined;
}
/**
 * IndexedDB Storage
 */
export declare class IndexedDBStorage extends EventEmitter<StorageEvents> {
    private dbName;
    private dbVersion;
    private db;
    private initPromise;
    constructor(options?: StorageOptions);
    /**
     * Initialize the database connection.
     */
    initialize(): Promise<void>;
    /**
     * Check if the storage is initialized.
     */
    isInitialized(): boolean;
    /**
     * Save a document.
     */
    saveDocument(id: string, name: string, data: string, thumbnail?: string): Promise<void>;
    /**
     * Load a document by ID.
     */
    loadDocument(id: string): Promise<StoredDocument | null>;
    /**
     * Delete a document by ID.
     */
    deleteDocument(id: string): Promise<void>;
    /**
     * Get document metadata by ID.
     */
    getDocumentMetadata(id: string): Promise<DocumentMetadata | null>;
    /**
     * List all documents.
     */
    listDocuments(): Promise<DocumentMetadata[]>;
    /**
     * Save an asset (image, font, etc).
     */
    saveAsset(id: string, data: Blob): Promise<void>;
    /**
     * Load an asset by ID.
     */
    loadAsset(id: string): Promise<Blob | null>;
    /**
     * Delete an asset by ID.
     */
    deleteAsset(id: string): Promise<void>;
    /**
     * Clear all data.
     */
    clearAll(): Promise<void>;
    /**
     * Close the database connection.
     */
    close(): void;
    private openDatabase;
    private createStores;
    private getDb;
}
/**
 * Create an IndexedDB storage instance.
 */
export declare function createIndexedDBStorage(options?: StorageOptions): IndexedDBStorage;
//# sourceMappingURL=indexed-db.d.ts.map