/**
 * Rectangle Tool
 *
 * Creates rectangular frames by click-and-drag.
 * Supports:
 * - Shift to constrain to square
 * - Alt to draw from center
 */
import { BaseTool } from '../base/tool';
const DEFAULT_OPTIONS = {
    minSize: 2,
    cornerRadius: 0,
    fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
};
/**
 * Rectangle tool for creating frame nodes
 */
export class RectangleTool extends BaseTool {
    name = 'rectangle';
    cursor = 'crosshair';
    options;
    startPoint = null;
    currentPoint = null;
    constrainSquare = false;
    drawFromCenter = false;
    createdNodeId = null;
    // Callbacks
    onRectComplete;
    onPreviewUpdate;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Set callback for when rectangle is completed.
     */
    setOnRectComplete(callback) {
        this.onRectComplete = callback;
    }
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback) {
        this.onPreviewUpdate = callback;
    }
    /**
     * Check if currently drawing.
     */
    isDrawing() {
        return this.startPoint !== null;
    }
    /**
     * Get current preview rectangle.
     */
    getPreviewRect() {
        if (!this.startPoint || !this.currentPoint)
            return null;
        return this.calculateRect(this.startPoint, this.currentPoint);
    }
    activate(context) {
        super.activate(context);
        this.reset();
    }
    deactivate() {
        this.reset();
        super.deactivate();
    }
    onPointerDown(event, _context) {
        this.startPoint = { x: event.worldX, y: event.worldY };
        this.currentPoint = this.startPoint;
        this.constrainSquare = event.shiftKey;
        this.drawFromCenter = event.altKey;
        return true;
    }
    onPointerMove(event, _context) {
        if (!this.startPoint)
            return;
        this.currentPoint = { x: event.worldX, y: event.worldY };
        this.constrainSquare = event.shiftKey;
        this.drawFromCenter = event.altKey;
        this.onPreviewUpdate?.();
    }
    onPointerUp(event, context) {
        if (!this.startPoint)
            return;
        this.currentPoint = { x: event.worldX, y: event.worldY };
        this.constrainSquare = event.shiftKey;
        this.drawFromCenter = event.altKey;
        const rect = this.calculateRect(this.startPoint, this.currentPoint);
        // Check minimum size
        const minSize = this.options.minSize / context.viewport.getZoom();
        if (rect.width >= minSize && rect.height >= minSize) {
            if (this.onRectComplete) {
                this.createdNodeId = this.onRectComplete(rect, this.options.cornerRadius);
            }
        }
        this.reset();
        this.onPreviewUpdate?.();
    }
    onKeyDown(event, _context) {
        if (event.key === 'Escape' && this.startPoint) {
            this.reset();
            this.onPreviewUpdate?.();
            return true;
        }
        if (event.key === 'Shift') {
            this.constrainSquare = true;
            this.onPreviewUpdate?.();
            return true;
        }
        if (event.key === 'Alt') {
            this.drawFromCenter = true;
            this.onPreviewUpdate?.();
            return true;
        }
        return false;
    }
    onKeyUp(event, _context) {
        if (event.key === 'Shift') {
            this.constrainSquare = false;
            this.onPreviewUpdate?.();
        }
        if (event.key === 'Alt') {
            this.drawFromCenter = false;
            this.onPreviewUpdate?.();
        }
    }
    render(ctx, context) {
        const rect = this.getPreviewRect();
        if (!rect)
            return;
        const viewport = context.viewport;
        ctx.save();
        // Canvas container already applies viewport transform, so we render in world coords
        // Draw preview rectangle
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
        ctx.fill();
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 1 / viewport.getZoom();
        ctx.stroke();
        // Draw dimensions
        const fontSize = 12 / viewport.getZoom();
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = '#0066FF';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(rect.width)} × ${Math.round(rect.height)}`, rect.x + rect.width / 2, rect.y + rect.height + fontSize * 1.5);
        ctx.restore();
    }
    /**
     * Calculate rectangle from two points.
     */
    calculateRect(start, end) {
        let x1 = start.x;
        let y1 = start.y;
        let x2 = end.x;
        let y2 = end.y;
        let width = Math.abs(x2 - x1);
        let height = Math.abs(y2 - y1);
        // Constrain to square
        if (this.constrainSquare) {
            const size = Math.max(width, height);
            width = size;
            height = size;
        }
        // Handle different drawing modes
        if (this.drawFromCenter) {
            // Draw from center
            return {
                x: x1 - width,
                y: y1 - height,
                width: width * 2,
                height: height * 2,
            };
        }
        else {
            // Draw from corner
            const signX = x2 >= x1 ? 1 : -1;
            const signY = y2 >= y1 ? 1 : -1;
            return {
                x: signX > 0 ? x1 : x1 - width,
                y: signY > 0 ? y1 : y1 - height,
                width,
                height,
            };
        }
    }
    /**
     * Reset the tool state.
     */
    reset() {
        this.startPoint = null;
        this.currentPoint = null;
        this.constrainSquare = false;
        this.drawFromCenter = false;
    }
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId() {
        return this.createdNodeId;
    }
}
/**
 * Create a rectangle tool.
 */
export function createRectangleTool(options) {
    return new RectangleTool(options);
}
//# sourceMappingURL=rectangle-tool.js.map