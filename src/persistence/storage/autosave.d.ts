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
    'autosave:started': {
        documentId: string;
    };
    'autosave:completed': {
        documentId: string;
    };
    'autosave:failed': {
        documentId: string;
        error: Error;
    };
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
 * Autosave Manager
 */
export declare class AutosaveManager extends EventEmitter<AutosaveEvents> {
    private sceneGraph;
    private serializer;
    private storage;
    private interval;
    private debounceDelay;
    private enabled;
    private saveOnChange;
    private state;
    private intervalId;
    private debounceId;
    private unsubscribes;
    constructor(sceneGraph: SceneGraph, serializer: DocumentSerializer, storage: IndexedDBStorage, options?: AutosaveOptions);
    /**
     * Start autosave for a document.
     */
    start(documentId: string): void;
    /**
     * Stop autosave.
     */
    stop(): void;
    /**
     * Force an immediate save.
     */
    saveNow(): Promise<void>;
    /**
     * Mark the document as dirty (needs saving).
     */
    markDirty(): void;
    /**
     * Check if there are unsaved changes.
     */
    hasUnsavedChanges(): boolean;
    /**
     * Get autosave statistics.
     */
    getStats(): {
        documentId: string | null;
        isDirty: boolean;
        isSaving: boolean;
        lastSaveTime: number;
        saveCount: number;
    };
    /**
     * Enable or disable autosave.
     */
    setEnabled(enabled: boolean): void;
    /**
     * Dispose of the autosave manager.
     */
    dispose(): void;
    private setupChangeListeners;
    private scheduleDebouncedSave;
    private saveIfDirty;
    private performSave;
}
/**
 * Create an autosave manager.
 */
export declare function createAutosaveManager(sceneGraph: SceneGraph, serializer: DocumentSerializer, storage: IndexedDBStorage, options?: AutosaveOptions): AutosaveManager;
//# sourceMappingURL=autosave.d.ts.map