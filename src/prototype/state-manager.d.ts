/**
 * Prototype State Manager
 *
 * Manages the state of a prototype during playback including
 * current frame, navigation history, and overlay stack.
 */
import type { NodeId } from '@core/types/common';
import type { PrototypeLink } from '@animation/types/transition';
/**
 * Navigation entry in the history.
 */
export interface NavigationEntry {
    /** Frame ID */
    readonly frameId: NodeId;
    /** Timestamp */
    readonly timestamp: number;
    /** Transition that led here (null for initial) */
    readonly transition: PrototypeLink | null;
}
/**
 * Overlay entry on the stack.
 */
export interface OverlayEntry {
    /** Overlay frame ID */
    readonly frameId: NodeId;
    /** Trigger node that opened this overlay */
    readonly triggeredBy: NodeId;
    /** Overlay settings */
    readonly settings: {
        readonly closeOnOutsideClick: boolean;
        readonly background: 'NONE' | 'DIM' | 'BLUR';
        readonly backgroundOpacity: number;
    };
}
/**
 * Prototype state.
 */
export interface PrototypeState {
    /** Current main frame */
    readonly currentFrame: NodeId;
    /** Navigation history */
    readonly history: readonly NavigationEntry[];
    /** Current position in history */
    readonly historyIndex: number;
    /** Overlay stack (bottom to top) */
    readonly overlays: readonly OverlayEntry[];
    /** Variables state (for prototype variables) */
    readonly variables: Readonly<Record<string, unknown>>;
    /** Whether prototype is running */
    readonly isRunning: boolean;
    /** Start time */
    readonly startTime: number;
}
/**
 * State change event.
 */
export interface StateChangeEvent {
    readonly type: 'navigate' | 'overlay-open' | 'overlay-close' | 'variable-change';
    readonly previousState: PrototypeState;
    readonly newState: PrototypeState;
}
/**
 * State change listener.
 */
export type StateChangeListener = (event: StateChangeEvent) => void;
/**
 * Prototype state manager.
 */
export declare class PrototypeStateManager {
    private state;
    private listeners;
    constructor(initialFrameId: NodeId);
    /**
     * Get current state.
     */
    getState(): PrototypeState;
    /**
     * Get the current visible frame (topmost overlay or main frame).
     */
    getVisibleFrame(): NodeId;
    /**
     * Start the prototype.
     */
    start(): void;
    /**
     * Stop the prototype.
     */
    stop(): void;
    /**
     * Reset to initial state.
     */
    reset(initialFrameId: NodeId): void;
    /**
     * Navigate to a new frame.
     */
    navigateTo(frameId: NodeId, transition?: PrototypeLink | null): void;
    /**
     * Go back in history.
     */
    goBack(): boolean;
    /**
     * Go forward in history.
     */
    goForward(): boolean;
    /**
     * Open an overlay.
     */
    openOverlay(frameId: NodeId, triggeredBy: NodeId, settings?: Partial<OverlayEntry['settings']>): void;
    /**
     * Close the topmost overlay.
     */
    closeOverlay(): boolean;
    /**
     * Close all overlays.
     */
    closeAllOverlays(): void;
    /**
     * Check if any overlays are open.
     */
    hasOverlays(): boolean;
    /**
     * Get a variable value.
     */
    getVariable<T = unknown>(name: string): T | undefined;
    /**
     * Set a variable value.
     */
    setVariable(name: string, value: unknown): void;
    /**
     * Can navigate back.
     */
    canGoBack(): boolean;
    /**
     * Can navigate forward.
     */
    canGoForward(): boolean;
    /**
     * Add state change listener.
     */
    addListener(listener: StateChangeListener): void;
    /**
     * Remove state change listener.
     */
    removeListener(listener: StateChangeListener): void;
    /**
     * Update state and optionally emit event.
     */
    private updateState;
    /**
     * Emit a state change event.
     */
    private emit;
}
/**
 * Create a prototype state manager.
 */
export declare function createStateManager(initialFrameId: NodeId): PrototypeStateManager;
//# sourceMappingURL=state-manager.d.ts.map