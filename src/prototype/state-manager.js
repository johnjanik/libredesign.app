/**
 * Prototype State Manager
 *
 * Manages the state of a prototype during playback including
 * current frame, navigation history, and overlay stack.
 */
/**
 * Prototype state manager.
 */
export class PrototypeStateManager {
    state;
    listeners = new Set();
    constructor(initialFrameId) {
        this.state = {
            currentFrame: initialFrameId,
            history: [
                {
                    frameId: initialFrameId,
                    timestamp: Date.now(),
                    transition: null,
                },
            ],
            historyIndex: 0,
            overlays: [],
            variables: {},
            isRunning: false,
            startTime: 0,
        };
    }
    /**
     * Get current state.
     */
    getState() {
        return this.state;
    }
    /**
     * Get the current visible frame (topmost overlay or main frame).
     */
    getVisibleFrame() {
        if (this.state.overlays.length > 0) {
            return this.state.overlays[this.state.overlays.length - 1].frameId;
        }
        return this.state.currentFrame;
    }
    /**
     * Start the prototype.
     */
    start() {
        if (this.state.isRunning)
            return;
        this.updateState({
            isRunning: true,
            startTime: Date.now(),
        });
    }
    /**
     * Stop the prototype.
     */
    stop() {
        if (!this.state.isRunning)
            return;
        this.updateState({
            isRunning: false,
        });
    }
    /**
     * Reset to initial state.
     */
    reset(initialFrameId) {
        const previousState = this.state;
        this.state = {
            currentFrame: initialFrameId,
            history: [
                {
                    frameId: initialFrameId,
                    timestamp: Date.now(),
                    transition: null,
                },
            ],
            historyIndex: 0,
            overlays: [],
            variables: {},
            isRunning: false,
            startTime: 0,
        };
        this.emit('navigate', previousState, this.state);
    }
    /**
     * Navigate to a new frame.
     */
    navigateTo(frameId, transition = null) {
        const previousState = this.state;
        // Close all overlays when navigating
        const newHistory = [
            ...this.state.history.slice(0, this.state.historyIndex + 1),
            {
                frameId,
                timestamp: Date.now(),
                transition,
            },
        ];
        this.state = {
            ...this.state,
            currentFrame: frameId,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            overlays: [],
        };
        this.emit('navigate', previousState, this.state);
    }
    /**
     * Go back in history.
     */
    goBack() {
        if (this.state.historyIndex <= 0)
            return false;
        const previousState = this.state;
        const newIndex = this.state.historyIndex - 1;
        const entry = this.state.history[newIndex];
        this.state = {
            ...this.state,
            currentFrame: entry.frameId,
            historyIndex: newIndex,
            overlays: [],
        };
        this.emit('navigate', previousState, this.state);
        return true;
    }
    /**
     * Go forward in history.
     */
    goForward() {
        if (this.state.historyIndex >= this.state.history.length - 1)
            return false;
        const previousState = this.state;
        const newIndex = this.state.historyIndex + 1;
        const entry = this.state.history[newIndex];
        this.state = {
            ...this.state,
            currentFrame: entry.frameId,
            historyIndex: newIndex,
            overlays: [],
        };
        this.emit('navigate', previousState, this.state);
        return true;
    }
    /**
     * Open an overlay.
     */
    openOverlay(frameId, triggeredBy, settings = {}) {
        const previousState = this.state;
        const overlay = {
            frameId,
            triggeredBy,
            settings: {
                closeOnOutsideClick: settings.closeOnOutsideClick ?? true,
                background: settings.background ?? 'DIM',
                backgroundOpacity: settings.backgroundOpacity ?? 0.5,
            },
        };
        this.state = {
            ...this.state,
            overlays: [...this.state.overlays, overlay],
        };
        this.emit('overlay-open', previousState, this.state);
    }
    /**
     * Close the topmost overlay.
     */
    closeOverlay() {
        if (this.state.overlays.length === 0)
            return false;
        const previousState = this.state;
        this.state = {
            ...this.state,
            overlays: this.state.overlays.slice(0, -1),
        };
        this.emit('overlay-close', previousState, this.state);
        return true;
    }
    /**
     * Close all overlays.
     */
    closeAllOverlays() {
        if (this.state.overlays.length === 0)
            return;
        const previousState = this.state;
        this.state = {
            ...this.state,
            overlays: [],
        };
        this.emit('overlay-close', previousState, this.state);
    }
    /**
     * Check if any overlays are open.
     */
    hasOverlays() {
        return this.state.overlays.length > 0;
    }
    /**
     * Get a variable value.
     */
    getVariable(name) {
        return this.state.variables[name];
    }
    /**
     * Set a variable value.
     */
    setVariable(name, value) {
        const previousState = this.state;
        this.state = {
            ...this.state,
            variables: {
                ...this.state.variables,
                [name]: value,
            },
        };
        this.emit('variable-change', previousState, this.state);
    }
    /**
     * Can navigate back.
     */
    canGoBack() {
        return this.state.historyIndex > 0;
    }
    /**
     * Can navigate forward.
     */
    canGoForward() {
        return this.state.historyIndex < this.state.history.length - 1;
    }
    /**
     * Add state change listener.
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Remove state change listener.
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Update state and optionally emit event.
     */
    updateState(updates) {
        this.state = { ...this.state, ...updates };
    }
    /**
     * Emit a state change event.
     */
    emit(type, previousState, newState) {
        const event = { type, previousState, newState };
        this.listeners.forEach((listener) => listener(event));
    }
}
/**
 * Create a prototype state manager.
 */
export function createStateManager(initialFrameId) {
    return new PrototypeStateManager(initialFrameId);
}
//# sourceMappingURL=state-manager.js.map