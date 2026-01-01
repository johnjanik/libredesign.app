/**
 * Ellipse Tool
 *
 * Creates elliptical shapes by click-and-drag.
 * Supports:
 * - Shift to constrain to circle
 * - Alt to draw from center
 */
import { BaseTool } from '../base/tool';
const DEFAULT_OPTIONS = {
    minSize: 2,
    fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
};
/**
 * Kappa constant for approximating circles with cubic beziers
 * kappa = 4 * (sqrt(2) - 1) / 3
 */
const KAPPA = 0.5522847498307936;
/**
 * Ellipse tool for creating vector nodes with ellipse paths
 */
export class EllipseTool extends BaseTool {
    name = 'ellipse';
    cursor = 'crosshair';
    options;
    startPoint = null;
    currentPoint = null;
    constrainCircle = false;
    drawFromCenter = false;
    createdNodeId = null;
    // Callbacks
    onEllipseComplete;
    onPreviewUpdate;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Set callback for when ellipse is completed.
     */
    setOnEllipseComplete(callback) {
        this.onEllipseComplete = callback;
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
     * Get current preview bounds.
     */
    getPreviewBounds() {
        if (!this.startPoint || !this.currentPoint)
            return null;
        return this.calculateBounds(this.startPoint, this.currentPoint);
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
        this.constrainCircle = event.shiftKey;
        this.drawFromCenter = event.altKey;
        return true;
    }
    onPointerMove(event, _context) {
        if (!this.startPoint)
            return;
        this.currentPoint = { x: event.worldX, y: event.worldY };
        this.constrainCircle = event.shiftKey;
        this.drawFromCenter = event.altKey;
        this.onPreviewUpdate?.();
    }
    onPointerUp(event, context) {
        if (!this.startPoint)
            return;
        this.currentPoint = { x: event.worldX, y: event.worldY };
        this.constrainCircle = event.shiftKey;
        this.drawFromCenter = event.altKey;
        const bounds = this.calculateBounds(this.startPoint, this.currentPoint);
        // Check minimum size
        const minSize = this.options.minSize / context.viewport.getZoom();
        if (bounds.width >= minSize && bounds.height >= minSize) {
            const path = this.createEllipsePath(bounds);
            if (this.onEllipseComplete) {
                this.createdNodeId = this.onEllipseComplete(path, bounds);
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
            this.constrainCircle = true;
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
            this.constrainCircle = false;
            this.onPreviewUpdate?.();
        }
        if (event.key === 'Alt') {
            this.drawFromCenter = false;
            this.onPreviewUpdate?.();
        }
    }
    render(ctx, context) {
        const bounds = this.getPreviewBounds();
        if (!bounds)
            return;
        const viewport = context.viewport;
        ctx.save();
        // Canvas container already applies viewport transform, so we render in world coords
        // Draw preview ellipse
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
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
        ctx.fillText(`${Math.round(bounds.width)} × ${Math.round(bounds.height)}`, cx, bounds.y + bounds.height + fontSize * 1.5);
        ctx.restore();
    }
    /**
     * Calculate bounds from two points.
     */
    calculateBounds(start, end) {
        let width = Math.abs(end.x - start.x);
        let height = Math.abs(end.y - start.y);
        // Constrain to circle
        if (this.constrainCircle) {
            const size = Math.max(width, height);
            width = size;
            height = size;
        }
        // Handle different drawing modes
        if (this.drawFromCenter) {
            return {
                x: start.x - width,
                y: start.y - height,
                width: width * 2,
                height: height * 2,
            };
        }
        else {
            const signX = end.x >= start.x ? 1 : -1;
            const signY = end.y >= start.y ? 1 : -1;
            return {
                x: signX > 0 ? start.x : start.x - width,
                y: signY > 0 ? start.y : start.y - height,
                width,
                height,
            };
        }
    }
    /**
     * Create an ellipse path using cubic bezier approximation.
     */
    createEllipsePath(bounds) {
        const cx = bounds.width / 2;
        const cy = bounds.height / 2;
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;
        const kx = rx * KAPPA;
        const ky = ry * KAPPA;
        const commands = [
            // Start at right
            { type: 'M', x: cx + rx, y: cy },
            // Bottom right quadrant
            { type: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
            // Bottom left quadrant
            { type: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
            // Top left quadrant
            { type: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
            // Top right quadrant
            { type: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
            // Close
            { type: 'Z' },
        ];
        return {
            windingRule: 'NONZERO',
            commands,
        };
    }
    /**
     * Reset the tool state.
     */
    reset() {
        this.startPoint = null;
        this.currentPoint = null;
        this.constrainCircle = false;
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
 * Create an ellipse tool.
 */
export function createEllipseTool(options) {
    return new EllipseTool(options);
}
//# sourceMappingURL=ellipse-tool.js.map