/**
 * Hand Tool
 *
 * Allows panning the canvas by clicking and dragging.
 */

import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '../base/tool';

/**
 * Hand tool for panning the viewport
 */
export class HandTool extends BaseTool {
  readonly name = 'hand';
  cursor: ToolCursor = 'grab';

  private isPanning = false;
  private lastCanvasX = 0;
  private lastCanvasY = 0;

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    this.isPanning = true;
    this.lastCanvasX = event.canvasX;
    this.lastCanvasY = event.canvasY;
    this.cursor = 'grabbing';
    return true;
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    if (!this.isPanning) return;

    const dx = event.canvasX - this.lastCanvasX;
    const dy = event.canvasY - this.lastCanvasY;

    context.viewport.pan(dx, dy);

    this.lastCanvasX = event.canvasX;
    this.lastCanvasY = event.canvasY;
  }

  override onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    this.isPanning = false;
    this.cursor = 'grab';
  }

  override deactivate(): void {
    this.isPanning = false;
    this.cursor = 'grab';
    super.deactivate();
  }
}

/**
 * Create a hand tool.
 */
export function createHandTool(): HandTool {
  return new HandTool();
}
