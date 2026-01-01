/**
 * Hand Tool
 *
 * Allows panning the canvas by clicking and dragging.
 */
import { BaseTool } from '../base/tool';
/**
 * Hand tool for panning the viewport
 */
export class HandTool extends BaseTool {
    name = 'hand';
    cursor = 'grab';
    isPanning = false;
    lastCanvasX = 0;
    lastCanvasY = 0;
    onPointerDown(event, _context) {
        this.isPanning = true;
        this.lastCanvasX = event.canvasX;
        this.lastCanvasY = event.canvasY;
        this.cursor = 'grabbing';
        return true;
    }
    onPointerMove(event, context) {
        if (!this.isPanning)
            return;
        const dx = event.canvasX - this.lastCanvasX;
        const dy = event.canvasY - this.lastCanvasY;
        context.viewport.pan(dx, dy);
        this.lastCanvasX = event.canvasX;
        this.lastCanvasY = event.canvasY;
    }
    onPointerUp(_event, _context) {
        this.isPanning = false;
        this.cursor = 'grab';
    }
    deactivate() {
        this.isPanning = false;
        this.cursor = 'grab';
        super.deactivate();
    }
}
/**
 * Create a hand tool.
 */
export function createHandTool() {
    return new HandTool();
}
//# sourceMappingURL=hand-tool.js.map