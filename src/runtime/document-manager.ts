/**
 * Document Manager
 *
 * Manages document lifecycle and state.
 */

import type { NodeId as _NodeId } from '@core/types/common';
import { EventEmitter } from '@core/events/event-emitter';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { DocumentSerializer } from '@persistence/serialization/document-serializer';
import type { IndexedDBStorage, DocumentMetadata } from '@persistence/storage/indexed-db';
import { generateUUID } from '@core/utils/uuid';

/**
 * Document manager events
 */
export type DocumentManagerEvents = {
  'document:created': { id: string; name: string };
  'document:opened': { id: string; name: string };
  'document:closed': { id: string };
  'document:saved': { id: string };
  'document:renamed': { id: string; name: string };
  'documents:changed': { documents: DocumentMetadata[] };
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
export class DocumentManager extends EventEmitter<DocumentManagerEvents> {
  private sceneGraph: SceneGraph;
  private serializer: DocumentSerializer;
  private storage: IndexedDBStorage;

  private openDocuments: Map<string, OpenDocument> = new Map();
  private currentDocumentId: string | null = null;

  constructor(
    sceneGraph: SceneGraph,
    serializer: DocumentSerializer,
    storage: IndexedDBStorage
  ) {
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
  createDocument(name: string = 'Untitled'): string {
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
  async openDocument(id: string): Promise<void> {
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
  async saveDocument(id?: string): Promise<void> {
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
  closeDocument(id: string): void {
    const doc = this.openDocuments.get(id);
    if (!doc) return;

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
  async renameDocument(id: string, name: string): Promise<void> {
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
  async deleteDocument(id: string): Promise<void> {
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
  getCurrentDocumentId(): string | null {
    return this.currentDocumentId;
  }

  /**
   * Get current document info.
   */
  getCurrentDocument(): OpenDocument | null {
    if (!this.currentDocumentId) return null;
    return this.openDocuments.get(this.currentDocumentId) ?? null;
  }

  /**
   * Get all open documents.
   */
  getOpenDocuments(): OpenDocument[] {
    return Array.from(this.openDocuments.values());
  }

  /**
   * Check if document has unsaved changes.
   */
  isDirty(id?: string): boolean {
    const docId = id ?? this.currentDocumentId;
    if (!docId) return false;

    return this.openDocuments.get(docId)?.isDirty ?? false;
  }

  /**
   * Mark document as dirty.
   */
  markDirty(id?: string): void {
    const docId = id ?? this.currentDocumentId;
    if (!docId) return;

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
  async listDocuments(): Promise<DocumentMetadata[]> {
    return this.storage.listDocuments();
  }

  /**
   * Refresh and emit document list.
   */
  async refreshDocumentList(): Promise<void> {
    const documents = await this.listDocuments();
    this.emit('documents:changed', { documents });
  }

  // =========================================================================
  // Import/Export
  // =========================================================================

  /**
   * Import document from JSON string.
   */
  importFromJSON(json: string, name?: string): string {
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
  exportToJSON(id?: string): string {
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
  downloadAsJSON(id?: string, filename?: string): void {
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
export function createDocumentManager(
  sceneGraph: SceneGraph,
  serializer: DocumentSerializer,
  storage: IndexedDBStorage
): DocumentManager {
  return new DocumentManager(sceneGraph, serializer, storage);
}
