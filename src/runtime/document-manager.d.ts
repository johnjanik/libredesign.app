/**
 * Document Manager
 *
 * Manages document lifecycle and state.
 */
import { EventEmitter } from '@core/events/event-emitter';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { DocumentSerializer } from '@persistence/serialization/document-serializer';
import type { IndexedDBStorage, DocumentMetadata } from '@persistence/storage/indexed-db';
/**
 * Document manager events
 */
export type DocumentManagerEvents = {
    'document:created': {
        id: string;
        name: string;
    };
    'document:opened': {
        id: string;
        name: string;
    };
    'document:closed': {
        id: string;
    };
    'document:saved': {
        id: string;
    };
    'document:renamed': {
        id: string;
        name: string;
    };
    'documents:changed': {
        documents: DocumentMetadata[];
    };
    [key: string]: unknown;
};
/**
 * Open document info
 */
export interface OpenDocument {
    readonly id: string;
    readonly name: string;
    readonly isDirty: boolean;
    readonly isNew: boolean;
    readonly lastSaved: number | null;
}
/**
 * Document Manager
 */
export declare class DocumentManager extends EventEmitter<DocumentManagerEvents> {
    private sceneGraph;
    private serializer;
    private storage;
    private openDocuments;
    private currentDocumentId;
    constructor(sceneGraph: SceneGraph, serializer: DocumentSerializer, storage: IndexedDBStorage);
    /**
     * Create a new document.
     */
    createDocument(name?: string): string;
    /**
     * Open a document from storage.
     */
    openDocument(id: string): Promise<void>;
    /**
     * Save the current document.
     */
    saveDocument(id?: string): Promise<void>;
    /**
     * Close a document.
     */
    closeDocument(id: string): void;
    /**
     * Rename a document.
     */
    renameDocument(id: string, name: string): Promise<void>;
    /**
     * Delete a document from storage.
     */
    deleteDocument(id: string): Promise<void>;
    /**
     * Get current document ID.
     */
    getCurrentDocumentId(): string | null;
    /**
     * Get current document info.
     */
    getCurrentDocument(): OpenDocument | null;
    /**
     * Get all open documents.
     */
    getOpenDocuments(): OpenDocument[];
    /**
     * Check if document has unsaved changes.
     */
    isDirty(id?: string): boolean;
    /**
     * Mark document as dirty.
     */
    markDirty(id?: string): void;
    /**
     * List all documents in storage.
     */
    listDocuments(): Promise<DocumentMetadata[]>;
    /**
     * Refresh and emit document list.
     */
    refreshDocumentList(): Promise<void>;
    /**
     * Import document from JSON string.
     */
    importFromJSON(json: string, name?: string): string;
    /**
     * Export document to JSON string.
     */
    exportToJSON(id?: string): string;
    /**
     * Export document to downloadable file.
     */
    downloadAsJSON(id?: string, filename?: string): void;
}
/**
 * Create a document manager.
 */
export declare function createDocumentManager(sceneGraph: SceneGraph, serializer: DocumentSerializer, storage: IndexedDBStorage): DocumentManager;
//# sourceMappingURL=document-manager.d.ts.map