/**
 * Autosave Manager
 *
 * Automatically saves documents at regular intervals and on changes.
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Autosave Manager
 */
export class AutosaveManager extends EventEmitter {
    sceneGraph;
    serializer;
    storage;
    interval;
    debounceDelay;
    enabled;
    saveOnChange;
    state = {
        documentId: null,
        isDirty: false,
        isSaving: false,
        lastSaveTime: 0,
        saveCount: 0,
    };
    intervalId = null;
    debounceId = null;
    unsubscribes = [];
    constructor(sceneGraph, serializer, storage, options = {}) {
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
    start(documentId) {
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
    stop() {
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
    async saveNow() {
        if (!this.state.documentId) {
            return;
        }
        await this.performSave();
    }
    /**
     * Mark the document as dirty (needs saving).
     */
    markDirty() {
        this.state.isDirty = true;
        if (this.enabled && this.saveOnChange) {
            this.scheduleDebouncedSave();
        }
    }
    /**
     * Check if there are unsaved changes.
     */
    hasUnsavedChanges() {
        return this.state.isDirty;
    }
    /**
     * Get autosave statistics.
     */
    getStats() {
        return { ...this.state };
    }
    /**
     * Enable or disable autosave.
     */
    setEnabled(enabled) {
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
    dispose() {
        this.stop();
        this.clear();
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    setupChangeListeners() {
        // Listen for scene graph changes
        const events = [
            'node:created',
            'node:deleted',
            'node:propertyChanged',
            'node:parentChanged',
        ];
        for (const event of events) {
            const unsubscribe = this.sceneGraph.on(event, () => {
                this.markDirty();
            });
            this.unsubscribes.push(unsubscribe);
        }
    }
    scheduleDebouncedSave() {
        if (this.debounceId !== null) {
            clearTimeout(this.debounceId);
        }
        this.debounceId = window.setTimeout(() => {
            this.debounceId = null;
            this.saveIfDirty();
        }, this.debounceDelay);
    }
    async saveIfDirty() {
        if (!this.state.isDirty || this.state.isSaving) {
            return;
        }
        await this.performSave();
    }
    async performSave() {
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
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('autosave:failed', { documentId, error });
        }
        finally {
            this.state.isSaving = false;
        }
    }
}
/**
 * Create an autosave manager.
 */
export function createAutosaveManager(sceneGraph, serializer, storage, options) {
    return new AutosaveManager(sceneGraph, serializer, storage, options);
}
//# sourceMappingURL=autosave.js.map