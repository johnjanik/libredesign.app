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
export class PrototypeStateManager {
  private state: PrototypeState;
  private listeners = new Set<StateChangeListener>();

  constructor(initialFrameId: NodeId) {
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
  getState(): PrototypeState {
    return this.state;
  }

  /**
   * Get the current visible frame (topmost overlay or main frame).
   */
  getVisibleFrame(): NodeId {
    if (this.state.overlays.length > 0) {
      return this.state.overlays[this.state.overlays.length - 1]!.frameId;
    }
    return this.state.currentFrame;
  }

  /**
   * Start the prototype.
   */
  start(): void {
    if (this.state.isRunning) return;

    this.updateState({
      isRunning: true,
      startTime: Date.now(),
    });
  }

  /**
   * Stop the prototype.
   */
  stop(): void {
    if (!this.state.isRunning) return;

    this.updateState({
      isRunning: false,
    });
  }

  /**
   * Reset to initial state.
   */
  reset(initialFrameId: NodeId): void {
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
  navigateTo(frameId: NodeId, transition: PrototypeLink | null = null): void {
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
  goBack(): boolean {
    if (this.state.historyIndex <= 0) return false;

    const previousState = this.state;
    const newIndex = this.state.historyIndex - 1;
    const entry = this.state.history[newIndex]!;

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
  goForward(): boolean {
    if (this.state.historyIndex >= this.state.history.length - 1) return false;

    const previousState = this.state;
    const newIndex = this.state.historyIndex + 1;
    const entry = this.state.history[newIndex]!;

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
  openOverlay(
    frameId: NodeId,
    triggeredBy: NodeId,
    settings: Partial<OverlayEntry['settings']> = {}
  ): void {
    const previousState = this.state;

    const overlay: OverlayEntry = {
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
  closeOverlay(): boolean {
    if (this.state.overlays.length === 0) return false;

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
  closeAllOverlays(): void {
    if (this.state.overlays.length === 0) return;

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
  hasOverlays(): boolean {
    return this.state.overlays.length > 0;
  }

  /**
   * Get a variable value.
   */
  getVariable<T = unknown>(name: string): T | undefined {
    return this.state.variables[name] as T | undefined;
  }

  /**
   * Set a variable value.
   */
  setVariable(name: string, value: unknown): void {
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
  canGoBack(): boolean {
    return this.state.historyIndex > 0;
  }

  /**
   * Can navigate forward.
   */
  canGoForward(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  /**
   * Add state change listener.
   */
  addListener(listener: StateChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove state change listener.
   */
  removeListener(listener: StateChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Update state and optionally emit event.
   */
  private updateState(updates: Partial<PrototypeState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Emit a state change event.
   */
  private emit(
    type: StateChangeEvent['type'],
    previousState: PrototypeState,
    newState: PrototypeState
  ): void {
    const event: StateChangeEvent = { type, previousState, newState };
    this.listeners.forEach((listener) => listener(event));
  }
}

/**
 * Create a prototype state manager.
 */
export function createStateManager(initialFrameId: NodeId): PrototypeStateManager {
  return new PrototypeStateManager(initialFrameId);
}
