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
export class PointerHandler extends EventEmitter<PointerHandlerEvents> {
  private element: HTMLElement;
  private viewport: Viewport;
  private doubleClickTimeout: number;
  private doubleClickDistance: number;

  // Click detection state
  private lastClickTime = 0;
  private lastClickPosition = { x: 0, y: 0 };
  private clickCount = 0;

  // Active pointer tracking
  private activePointers: Map<number, PointerEvent> = new Map();

  // Bound handlers for cleanup
  private boundHandlers: {
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
    wheel: (e: WheelEvent) => void;
    contextmenu: (e: Event) => void;
  };

  constructor(element: HTMLElement, viewport: Viewport, options: PointerHandlerOptions = {}) {
    super();
    this.element = element;
    this.viewport = viewport;
    this.doubleClickTimeout = options.doubleClickTimeout ?? 300;
    this.doubleClickDistance = options.doubleClickDistance ?? 4;

    // Create bound handlers
    this.boundHandlers = {
      pointerdown: this.handlePointerDown.bind(this),
      pointermove: this.handlePointerMove.bind(this),
      pointerup: this.handlePointerUp.bind(this),
      pointercancel: this.handlePointerCancel.bind(this),
      wheel: this.handleWheel.bind(this),
      contextmenu: this.handleContextMenu.bind(this),
    };

    this.attach();
  }

  /**
   * Attach event listeners.
   */
  attach(): void {
    this.element.addEventListener('pointerdown', this.boundHandlers.pointerdown);
    this.element.addEventListener('pointermove', this.boundHandlers.pointermove);
    this.element.addEventListener('pointerup', this.boundHandlers.pointerup);
    this.element.addEventListener('pointercancel', this.boundHandlers.pointercancel);
    this.element.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.element.addEventListener('contextmenu', this.boundHandlers.contextmenu);

    // Capture pointer events during drag
    this.element.style.touchAction = 'none';
  }

  /**
   * Detach event listeners.
   */
  detach(): void {
    this.element.removeEventListener('pointerdown', this.boundHandlers.pointerdown);
    this.element.removeEventListener('pointermove', this.boundHandlers.pointermove);
    this.element.removeEventListener('pointerup', this.boundHandlers.pointerup);
    this.element.removeEventListener('pointercancel', this.boundHandlers.pointercancel);
    this.element.removeEventListener('wheel', this.boundHandlers.wheel);
    this.element.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
  }

  /**
   * Dispose of the handler.
   */
  dispose(): void {
    this.detach();
    this.activePointers.clear();
    this.clear();
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handlePointerDown(e: PointerEvent): void {
    // Capture pointer for drag operations
    this.element.setPointerCapture(e.pointerId);
    this.activePointers.set(e.pointerId, e);

    const data = this.createPointerEventData(e);

    // Handle click/double-click detection
    const now = performance.now();
    const timeDelta = now - this.lastClickTime;
    const distance = Math.sqrt(
      Math.pow(e.clientX - this.lastClickPosition.x, 2) +
      Math.pow(e.clientY - this.lastClickPosition.y, 2)
    );

    if (timeDelta < this.doubleClickTimeout && distance < this.doubleClickDistance) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }

    this.lastClickTime = now;
    this.lastClickPosition = { x: e.clientX, y: e.clientY };

    this.emit('pointerdown', data);
  }

  private handlePointerMove(e: PointerEvent): void {
    // Update active pointer
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, e);
    }

    const data = this.createPointerEventData(e);
    this.emit('pointermove', data);
  }

  private handlePointerUp(e: PointerEvent): void {
    // Release pointer capture
    this.element.releasePointerCapture(e.pointerId);
    this.activePointers.delete(e.pointerId);

    const data = this.createPointerEventData(e);
    this.emit('pointerup', data);

    // Emit click/doubleclick
    if (this.clickCount === 1) {
      this.emit('click', data);
    } else if (this.clickCount === 2) {
      this.emit('doubleclick', data);
      this.clickCount = 0;
    }
  }

  private handlePointerCancel(e: PointerEvent): void {
    this.element.releasePointerCapture(e.pointerId);
    this.activePointers.delete(e.pointerId);
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    this.emit('wheel', e);
  }

  private handleContextMenu(e: Event): void {
    e.preventDefault();
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Create pointer event data from a browser PointerEvent.
   *
   * Uses the universal DOM-to-Canvas transformation:
   * 1. Get canvas bounding rect (handles CSS transforms, padding, borders)
   * 2. Calculate CSS-relative position
   * 3. Scale by canvas.width/rect.width (handles devicePixelRatio correctly)
   * 4. Convert to world coordinates via viewport
   */
  private createPointerEventData(e: PointerEvent): PointerEventData {
    // Step 1: Get the canvas's ACTUAL screen position
    const rect = this.element.getBoundingClientRect();
    const canvas = this.element as HTMLCanvasElement;

    // Step 2: Calculate position relative to canvas (in CSS pixels)
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    // Step 3: Scale to canvas pixel coordinates
    // This handles devicePixelRatio correctly regardless of how canvas is sized
    // canvas.width = drawing buffer size, rect.width = CSS display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const pixelX = cssX * scaleX;
    const pixelY = cssY * scaleY;

    // Step 4: Canvas pixels to world coordinates (viewport handles NDC conversion)
    const worldPoint = this.viewport.canvasToWorld(pixelX, pixelY);

    // Debug logging - remove after fixing coordinate issue
    if (e.type === 'pointerdown') {
      const offset = this.viewport.getOffset();
      const zoom = this.viewport.getZoom();
      const canvasSize = this.viewport.getCanvasSize();
      console.log('[PointerHandler Debug]', {
        step1_client: { x: e.clientX, y: e.clientY },
        step2_rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        step3_cssRelative: { x: cssX, y: cssY },
        step4_scale: { x: scaleX, y: scaleY },
        step5_canvasPixels: { x: pixelX, y: pixelY },
        viewport: { offset, zoom, canvasSize },
        result_world: { x: worldPoint.x, y: worldPoint.y },
      });
    }

    return {
      canvasX: pixelX,
      canvasY: pixelY,
      worldX: worldPoint.x,
      worldY: worldPoint.y,
      button: e.button,
      buttons: e.buttons,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      pressure: e.pressure,
    };
  }

  /**
   * Get current pointer position.
   */
  getCurrentPointer(): PointerEventData | null {
    const pointer = this.activePointers.values().next().value as PointerEvent | undefined;
    if (pointer) {
      return this.createPointerEventData(pointer);
    }
    return null;
  }

  /**
   * Check if a pointer is currently down.
   */
  isPointerDown(): boolean {
    return this.activePointers.size > 0;
  }

  /**
   * Get the number of active pointers (for multi-touch).
   */
  getPointerCount(): number {
    return this.activePointers.size;
  }
}

/**
 * Create a pointer handler.
 */
export function createPointerHandler(
  element: HTMLElement,
  viewport: Viewport,
  options?: PointerHandlerOptions
): PointerHandler {
  return new PointerHandler(element, viewport, options);
}
