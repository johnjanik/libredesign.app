/**
 * Interaction Handler
 *
 * Handles user interactions during prototype playback.
 * Maps user input to prototype triggers.
 */
import type { NodeId } from '@core/types/common';
import type { TriggerType, PrototypeLink } from '@animation/types/transition';
/**
 * Pointer event data.
 */
export interface PointerEventData {
    /** X position relative to prototype container */
    readonly x: number;
    /** Y position relative to prototype container */
    readonly y: number;
    /** Pointer ID for multi-touch */
    readonly pointerId: number;
    /** Pointer type */
    readonly pointerType: 'mouse' | 'touch' | 'pen';
    /** Button pressed (for mouse) */
    readonly button: number;
    /** Is primary pointer */
    readonly isPrimary: boolean;
}
/**
 * Keyboard event data.
 */
export interface KeyboardEventData {
    /** Key code */
    readonly key: string;
    /** Key code */
    readonly code: string;
    /** Modifiers */
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
}
/**
 * Drag event data.
 */
export interface DragEventData {
    /** Start position */
    readonly startX: number;
    readonly startY: number;
    /** Current position */
    readonly currentX: number;
    readonly currentY: number;
    /** Delta from start */
    readonly deltaX: number;
    readonly deltaY: number;
    /** Is dragging */
    readonly isDragging: boolean;
}
/**
 * Interaction state.
 */
export interface InteractionState {
    /** Currently hovered nodes */
    readonly hoveredNodes: Set<NodeId>;
    /** Currently pressed nodes */
    readonly pressedNodes: Set<NodeId>;
    /** Active drag state */
    readonly dragState: DragEventData | null;
    /** Last click time for double-click detection */
    readonly lastClickTime: number;
    /** Last clicked node for double-click detection */
    readonly lastClickedNode: NodeId | null;
}
/**
 * Trigger event.
 */
export interface TriggerEvent {
    /** Trigger type */
    readonly trigger: TriggerType;
    /** Source node */
    readonly sourceNodeId: NodeId;
    /** Related prototype link (if found) */
    readonly link: PrototypeLink | null;
    /** Original event data */
    readonly eventData: PointerEventData | KeyboardEventData | null;
}
/**
 * Trigger event listener.
 */
export type TriggerEventListener = (event: TriggerEvent) => void;
/**
 * Hit test function.
 */
export type HitTestFunction = (x: number, y: number) => NodeId | null;
/**
 * Link lookup function.
 */
export type LinkLookupFunction = (nodeId: NodeId, trigger: TriggerType) => PrototypeLink | null;
/**
 * Interaction handler options.
 */
export interface InteractionHandlerOptions {
    /** Double-click detection threshold (ms) */
    readonly doubleClickThreshold?: number;
    /** Drag detection threshold (px) */
    readonly dragThreshold?: number;
    /** Press threshold for hold detection (ms) */
    readonly pressThreshold?: number;
}
/**
 * Interaction handler for prototype playback.
 */
export declare class InteractionHandler {
    private state;
    private listeners;
    private hitTest;
    private lookupLink;
    private options;
    private pressTimers;
    private timeoutTimers;
    constructor(hitTest: HitTestFunction, lookupLink: LinkLookupFunction, options?: InteractionHandlerOptions);
    /**
     * Handle pointer down event.
     */
    onPointerDown(event: PointerEventData): void;
    /**
     * Handle pointer move event.
     */
    onPointerMove(event: PointerEventData): void;
    /**
     * Handle pointer up event.
     */
    onPointerUp(event: PointerEventData): void;
    /**
     * Handle key down event.
     */
    onKeyDown(_event: KeyboardEventData, focusedNodeId: NodeId | null): void;
    /**
     * Schedule a timeout trigger.
     */
    scheduleTimeout(nodeId: NodeId, delay: number): void;
    /**
     * Clear a timeout trigger.
     */
    clearTimeout(nodeId: NodeId): void;
    /**
     * Clear all timers.
     */
    clearAllTimers(): void;
    /**
     * Add trigger event listener.
     */
    addListener(listener: TriggerEventListener): void;
    /**
     * Remove trigger event listener.
     */
    removeListener(listener: TriggerEventListener): void;
    /**
     * Dispose the handler.
     */
    dispose(): void;
    /**
     * Update hover state and emit events.
     */
    private updateHoverState;
    /**
     * Emit a trigger event.
     */
    private emitTrigger;
}
/**
 * Create an interaction handler.
 */
export declare function createInteractionHandler(hitTest: HitTestFunction, lookupLink: LinkLookupFunction, options?: InteractionHandlerOptions): InteractionHandler;
//# sourceMappingURL=interaction-handler.d.ts.map