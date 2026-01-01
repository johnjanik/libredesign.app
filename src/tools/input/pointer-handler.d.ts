/**
 * Pointer Handler - Unified pointer event handling
 *
 * Normalizes mouse, touch, and pen input into a unified pointer API.
 */
import type { Viewport } from '@renderer/core/viewport';
import type { PointerEventData } from '../base/tool';
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Pointer handler events
 */
export type PointerHandlerEvents = {
    'pointerdown': PointerEventData;
    'pointermove': PointerEventData;
    'pointerup': PointerEventData;
    'click': PointerEventData;
    'doubleclick': PointerEventData;
    'wheel': WheelEvent;
    [key: string]: unknown;
};
/**
 * Pointer handler options
 */
export interface PointerHandlerOptions {
    /** Double click timeout in ms */
    doubleClickTimeout?: number;
    /** Double click distance threshold */
    doubleClickDistance?: number;
}
/**
 * Pointer Handler
 */
export declare class PointerHandler extends EventEmitter<PointerHandlerEvents> {
    private element;
    private viewport;
    private doubleClickTimeout;
    private doubleClickDistance;
    private lastClickTime;
    private lastClickPosition;
    private clickCount;
    private activePointers;
    private boundHandlers;
    constructor(element: HTMLElement, viewport: Viewport, options?: PointerHandlerOptions);
    /**
     * Attach event listeners.
     */
    attach(): void;
    /**
     * Detach event listeners.
     */
    detach(): void;
    /**
     * Dispose of the handler.
     */
    dispose(): void;
    private handlePointerDown;
    private handlePointerMove;
    private handlePointerUp;
    private handlePointerCancel;
    private handleWheel;
    private handleContextMenu;
    /**
     * Create pointer event data from a browser PointerEvent.
     *
     * Uses the universal DOM-to-Canvas transformation:
     * 1. Get canvas bounding rect (handles CSS transforms, padding, borders)
     * 2. Calculate CSS-relative position
     * 3. Scale by canvas.width/rect.width (handles devicePixelRatio correctly)
     * 4. Convert to world coordinates via viewport
     */
    private createPointerEventData;
    /**
     * Get current pointer position.
     */
    getCurrentPointer(): PointerEventData | null;
    /**
     * Check if a pointer is currently down.
     */
    isPointerDown(): boolean;
    /**
     * Get the number of active pointers (for multi-touch).
     */
    getPointerCount(): number;
}
/**
 * Create a pointer handler.
 */
export declare function createPointerHandler(element: HTMLElement, viewport: Viewport, options?: PointerHandlerOptions): PointerHandler;
//# sourceMappingURL=pointer-handler.d.ts.map