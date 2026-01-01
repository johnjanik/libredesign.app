/**
 * Autosave Manager
 *
 * Automatically saves documents at regular intervals and on changes.
 */

import type { SceneGraph } from '@scene/graph/scene-graph';
import type { DocumentSerializer } from '../serialization/document-serializer';
import type { IndexedDBStorage } from './indexed-db';
import { EventEmitter } from '@core/events/event-emitter';

/**
 * Autosave events
 */
export type AutosaveEvents = {
  'autosave:started': { documentId: string };
  'autosave:completed': { documentId: string };
  'autosave:failed': { documentId: string; error: Error };
  [key: string]: unknown;
};

/**
 * Autosave options
 */
export interface AutosaveOptions {
  /** Autosave interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number | undefined;
  /** Debounce delay for change-based saves (default: 2000 = 2 seconds) */
  debounceDelay?: number | undefined;
  /** Whether to enable autosave (default: true) */
  enabled?: boolean | undefined;
  /** Whether to save on every change (default: true) */
  saveOnChange?: boolean | undefined;
}

/**
 * Autosave state
 */
interface AutosaveState {
  documentId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaveTime: number;
  saveCount: number;
}

/**
 * Autosave Manager
 */
export class AutosaveManager extends EventEmitter<AutosaveEvents> {
  private sceneGraph: SceneGraph;
  private serializer: DocumentSerializer;
  private storage: IndexedDBStorage;

  private interval: number;
  private debounceDelay: number;
  private enabled: boolean;
  private saveOnChange: boolean;

  private state: AutosaveState = {
    documentId: null,
    isDirty: false,
    isSaving: false,
    lastSaveTime: 0,
    saveCount: 0,
  };

  private intervalId: number | null = null;
  private debounceId: number | null = null;
  private unsubscribes: (() => void)[] = [];

  constructor(
    sceneGraph: SceneGraph,
    serializer: DocumentSerializer,
    storage: IndexedDBStorage,
    options: AutosaveOptions = {}
  ) {
    super();
    this.sceneGraph = sceneGraph;
    this.serializer = serializer;
    this.storage = storage;

    this.interval = options.interval ?? 30000;
    this.debounceDelay = options.debounceDelay ?? 2000;
    this.enabled = options.enabled ?? true;
    this.saveOnChange = options.saveOnChange ?? true;
  }

  /**
   * Start autosave for a document.
   */
  start(documentId: string): void {
    this.stop();

    this.state.documentId = documentId;
    this.state.isDirty = false;
    this.state.lastSaveTime = Date.now();

    // Set up interval-based autosave
    if (this.enabled && this.interval > 0) {
      this.intervalId = window.setInterval(() => {
        this.saveIfDirty();
      }, this.interval);
    }

    // Set up change-based autosave
    if (this.enabled && this.saveOnChange) {
      this.setupChangeListeners();
    }
  }

  /**
   * Stop autosave.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.debounceId !== null) {
      clearTimeout(this.debounceId);
      this.debounceId = null;
    }

    for (const unsubscribe of this.unsubscribes) {
      unsubscribe();
    }
    this.unsubscribes = [];

    this.state.documentId = null;
  }

  /**
   * Force an immediate save.
   */
  async saveNow(): Promise<void> {
    if (!this.state.documentId) {
      return;
    }

    await this.performSave();
  }

  /**
   * Mark the document as dirty (needs saving).
   */
  markDirty(): void {
    this.state.isDirty = true;

    if (this.enabled && this.saveOnChange) {
      this.scheduleDebouncedSave();
    }
  }

  /**
   * Check if there are unsaved changes.
   */
  hasUnsavedChanges(): boolean {
    return this.state.isDirty;
  }

  /**
   * Get autosave statistics.
   */
  getStats(): {
    documentId: string | null;
    isDirty: boolean;
    isSaving: boolean;
    lastSaveTime: number;
    saveCount: number;
  } {
    return { ...this.state };
  }

  /**
   * Enable or disable autosave.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (this.state.documentId) {
      // Restart with new settings
      const docId = this.state.documentId;
      this.stop();
      this.start(docId);
    }
  }

  /**
   * Dispose of the autosave manager.
   */
  dispose(): void {
    this.stop();
    this.clear();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private setupChangeListeners(): void {
    // Listen for scene graph changes
    const events = [
      'node:created',
      'node:deleted',
      'node:propertyChanged',
      'node:parentChanged',
    ] as const;

    for (const event of events) {
      const unsubscribe = this.sceneGraph.on(event, () => {
        this.markDirty();
      });
      this.unsubscribes.push(unsubscribe);
    }
  }

  private scheduleDebouncedSave(): void {
    if (this.debounceId !== null) {
      clearTimeout(this.debounceId);
    }

    this.debounceId = window.setTimeout(() => {
      this.debounceId = null;
      this.saveIfDirty();
    }, this.debounceDelay);
  }

  private async saveIfDirty(): Promise<void> {
    if (!this.state.isDirty || this.state.isSaving) {
      return;
    }

    await this.performSave();
  }

  private async performSave(): Promise<void> {
    const documentId = this.state.documentId;
    if (!documentId) {
      return;
    }

    this.state.isSaving = true;
    this.emit('autosave:started', { documentId });

    try {
      // Serialize the document
      const json = this.serializer.serialize(this.sceneGraph, {
        includeMetadata: true,
      });

      // Get document name
      const doc = this.sceneGraph.getDocument();
      const name = doc?.name ?? 'Untitled';

      // Generate thumbnail (optional - could be expensive)
      // const thumbnail = await this.generateThumbnail();

      // Save to storage
      await this.storage.saveDocument(documentId, name, json);

      this.state.isDirty = false;
      this.state.lastSaveTime = Date.now();
      this.state.saveCount++;

      this.emit('autosave:completed', { documentId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('autosave:failed', { documentId, error });
    } finally {
      this.state.isSaving = false;
    }
  }
}

/**
 * Create an autosave manager.
 */
export function createAutosaveManager(
  sceneGraph: SceneGraph,
  serializer: DocumentSerializer,
  storage: IndexedDBStorage,
  options?: AutosaveOptions
): AutosaveManager {
  return new AutosaveManager(sceneGraph, serializer, storage, options);
}
