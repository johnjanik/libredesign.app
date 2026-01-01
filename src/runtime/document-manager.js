/**
 * Document Manager
 *
 * Manages document lifecycle and state.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { generateUUID } from '@core/utils/uuid';
/**
 * Document Manager
 */
export class DocumentManager extends EventEmitter {
    sceneGraph;
    serializer;
    storage;
    openDocuments = new Map();
    currentDocumentId = null;
    constructor(sceneGraph, serializer, storage) {
        super();
        this.sceneGraph = sceneGraph;
        this.serializer = serializer;
        this.storage = storage;
    }
    // =========================================================================
    // Document Lifecycle
    // =========================================================================
    /**
     * Create a new document.
     */
    createDocument(name = 'Untitled') {
        const id = generateUUID();
        // Create document in scene graph
        this.sceneGraph.createNewDocument(name);
        // Track open document
        this.openDocuments.set(id, {
            id,
            name,
            isDirty: true,
            isNew: true,
            lastSaved: null,
        });
        this.currentDocumentId = id;
        this.emit('document:created', { id, name });
        return id;
    }
    /**
     * Open a document from storage.
     */
    async openDocument(id) {
        // Check if already open
        if (this.openDocuments.has(id)) {
            this.currentDocumentId = id;
            return;
        }
        const stored = await this.storage.loadDocument(id);
        if (!stored) {
            throw new Error(`Document not found: ${id}`);
        }
        // Deserialize into scene graph
        this.serializer.deserialize(stored.data, this.sceneGraph);
        // Track open document
        this.openDocuments.set(id, {
            id,
            name: stored.name,
            isDirty: false,
            isNew: false,
            lastSaved: stored.updatedAt,
        });
        this.currentDocumentId = id;
        this.emit('document:opened', { id, name: stored.name });
    }
    /**
     * Save the current document.
     */
    async saveDocument(id) {
        const docId = id ?? this.currentDocumentId;
        if (!docId) {
            throw new Error('No document to save');
        }
        const doc = this.openDocuments.get(docId);
        if (!doc) {
            throw new Error(`Document not open: ${docId}`);
        }
        const json = this.serializer.serialize(this.sceneGraph, {
            includeMetadata: true,
        });
        await this.storage.saveDocument(docId, doc.name, json);
        // Update document state
        this.openDocuments.set(docId, {
            ...doc,
            isDirty: false,
            isNew: false,
            lastSaved: Date.now(),
        });
        this.emit('document:saved', { id: docId });
    }
    /**
     * Close a document.
     */
    closeDocument(id) {
        const doc = this.openDocuments.get(id);
        if (!doc)
            return;
        // Check for unsaved changes
        if (doc.isDirty) {
            // In a real app, would prompt user
            console.warn(`Closing document with unsaved changes: ${id}`);
        }
        this.openDocuments.delete(id);
        if (this.currentDocumentId === id) {
            // Switch to another open document or null
            const remaining = Array.from(this.openDocuments.keys());
            this.currentDocumentId = remaining[0] ?? null;
        }
        this.emit('document:closed', { id });
    }
    /**
     * Rename a document.
     */
    async renameDocument(id, name) {
        const doc = this.openDocuments.get(id);
        if (!doc) {
            throw new Error(`Document not open: ${id}`);
        }
        // Update in scene graph
        const sceneDoc = this.sceneGraph.getDocument();
        if (sceneDoc) {
            this.sceneGraph.updateNode(sceneDoc.id, { name });
        }
        // Update tracking
        this.openDocuments.set(id, {
            ...doc,
            name,
            isDirty: true,
        });
        this.emit('document:renamed', { id, name });
    }
    /**
     * Delete a document from storage.
     */
    async deleteDocument(id) {
        // Close if open
        if (this.openDocuments.has(id)) {
            this.closeDocument(id);
        }
        await this.storage.deleteDocument(id);
        await this.refreshDocumentList();
    }
    // =========================================================================
    // Document State
    // =========================================================================
    /**
     * Get current document ID.
     */
    getCurrentDocumentId() {
        return this.currentDocumentId;
    }
    /**
     * Get current document info.
     */
    getCurrentDocument() {
        if (!this.currentDocumentId)
            return null;
        return this.openDocuments.get(this.currentDocumentId) ?? null;
    }
    /**
     * Get all open documents.
     */
    getOpenDocuments() {
        return Array.from(this.openDocuments.values());
    }
    /**
     * Check if document has unsaved changes.
     */
    isDirty(id) {
        const docId = id ?? this.currentDocumentId;
        if (!docId)
            return false;
        return this.openDocuments.get(docId)?.isDirty ?? false;
    }
    /**
     * Mark document as dirty.
     */
    markDirty(id) {
        const docId = id ?? this.currentDocumentId;
        if (!docId)
            return;
        const doc = this.openDocuments.get(docId);
        if (doc && !doc.isDirty) {
            this.openDocuments.set(docId, {
                ...doc,
                isDirty: true,
            });
        }
    }
    // =========================================================================
    // Document List
    // =========================================================================
    /**
     * List all documents in storage.
     */
    async listDocuments() {
        return this.storage.listDocuments();
    }
    /**
     * Refresh and emit document list.
     */
    async refreshDocumentList() {
        const documents = await this.listDocuments();
        this.emit('documents:changed', { documents });
    }
    // =========================================================================
    // Import/Export
    // =========================================================================
    /**
     * Import document from JSON string.
     */
    importFromJSON(json, name) {
        const id = generateUUID();
        const parsed = this.serializer.parse(json);
        // Use provided name or parsed name
        const docName = name ?? parsed.name ?? 'Imported Document';
        // Deserialize into scene graph
        this.serializer.deserialize(json, this.sceneGraph);
        // Track open document
        this.openDocuments.set(id, {
            id,
            name: docName,
            isDirty: true,
            isNew: true,
            lastSaved: null,
        });
        this.currentDocumentId = id;
        this.emit('document:created', { id, name: docName });
        return id;
    }
    /**
     * Export document to JSON string.
     */
    exportToJSON(id) {
        const docId = id ?? this.currentDocumentId;
        if (!docId) {
            throw new Error('No document to export');
        }
        return this.serializer.serialize(this.sceneGraph, {
            includeMetadata: true,
            prettyPrint: true,
        });
    }
    /**
     * Export document to downloadable file.
     */
    downloadAsJSON(id, filename) {
        const json = this.exportToJSON(id);
        const doc = id ? this.openDocuments.get(id) : this.getCurrentDocument();
        const name = filename ?? `${doc?.name ?? 'document'}.designlibre.json`;
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
    }
}
/**
 * Create a document manager.
 */
export function createDocumentManager(sceneGraph, serializer, storage) {
    return new DocumentManager(sceneGraph, serializer, storage);
}
//# sourceMappingURL=document-manager.js.map