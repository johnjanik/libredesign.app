/**
 * Line Tool
 *
 * Creates straight lines by click-and-drag.
 * Supports:
 * - Shift to constrain to 45° angles
 */
import { BaseTool } from '../base/tool';
const DEFAULT_OPTIONS = {
    minLength: 2,
    strokeWidth: 1,
    strokeColor: { r: 0, g: 0, b: 0, a: 1 },
};
/**
 * Snap angle to nearest 45° increment
 */
function snapAngle(angle) {
    const snap = Math.PI / 4; // 45 degrees
    return Math.round(angle / snap) * snap;
}
/**
 * Line tool for creating vector line nodes
 */
export class LineTool extends BaseTool {
    name = 'line';
    cursor = 'crosshair';
    options;
    startPoint = null;
    endPoint = null;
    constrainAngle = false;
    createdNodeId = null;
    // Callbacks
    onLineComplete;
    onPreviewUpdate;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Set callback for when line is completed.
     */
    setOnLineComplete(callback) {
        this.onLineComplete = callback;
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
     * Get current line endpoints.
     */
    getLinePoints() {
        if (!this.startPoint || !this.endPoint)
            return null;
        return {
            start: this.startPoint,
            end: this.constrainAngle ? this.constrainEndPoint(this.startPoint, this.endPoint) : this.endPoint,
        };
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
        this.endPoint = this.startPoint;
        this.constrainAngle = event.shiftKey;
        return true;
    }
    onPointerMove(event, _context) {
        if (!this.startPoint)
            return;
        this.endPoint = { x: event.worldX, y: event.worldY };
        this.constrainAngle = event.shiftKey;
        this.onPreviewUpdate?.();
    }
    onPointerUp(event, context) {
        if (!this.startPoint)
            return;
        this.endPoint = { x: event.worldX, y: event.worldY };
        this.constrainAngle = event.shiftKey;
        const finalEnd = this.constrainAngle
            ? this.constrainEndPoint(this.startPoint, this.endPoint)
            : this.endPoint;
        // Check minimum length
        const dx = finalEnd.x - this.startPoint.x;
        const dy = finalEnd.y - this.startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const minLength = this.options.minLength / context.viewport.getZoom();
        if (length >= minLength) {
            const path = this.createLinePath(this.startPoint, finalEnd);
            if (this.onLineComplete) {
                this.createdNodeId = this.onLineComplete(path, this.startPoint, finalEnd);
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
            this.constrainAngle = true;
            this.onPreviewUpdate?.();
            return true;
        }
        return false;
    }
    onKeyUp(event, _context) {
        if (event.key === 'Shift') {
            this.constrainAngle = false;
            this.onPreviewUpdate?.();
        }
    }
    render(ctx, context) {
        const points = this.getLinePoints();
        if (!points)
            return;
        const viewport = context.viewport;
        ctx.save();
        // Canvas container already applies viewport transform, so we render in world coords
        // Draw preview line
        ctx.beginPath();
        ctx.moveTo(points.start.x, points.start.y);
        ctx.lineTo(points.end.x, points.end.y);
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = Math.max(this.options.strokeWidth, 1 / viewport.getZoom());
        ctx.stroke();
        // Draw endpoints
        const pointRadius = 4 / viewport.getZoom();
        ctx.beginPath();
        ctx.arc(points.start.x, points.start.y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 1.5 / viewport.getZoom();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(points.end.x, points.end.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Draw length
        const dx = points.end.x - points.start.x;
        const dy = points.end.y - points.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const midX = (points.start.x + points.end.x) / 2;
        const midY = (points.start.y + points.end.y) / 2;
        const fontSize = 12 / viewport.getZoom();
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = '#0066FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        // Offset text perpendicular to line
        const angle = Math.atan2(dy, dx);
        const offsetX = Math.sin(angle) * fontSize;
        const offsetY = -Math.cos(angle) * fontSize;
        ctx.fillText(`${Math.round(length)}`, midX + offsetX, midY + offsetY);
        ctx.restore();
    }
    /**
     * Constrain end point to 45° angles.
     */
    constrainEndPoint(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0)
            return end;
        const angle = Math.atan2(dy, dx);
        const snappedAngle = snapAngle(angle);
        return {
            x: start.x + Math.cos(snappedAngle) * length,
            y: start.y + Math.sin(snappedAngle) * length,
        };
    }
    /**
     * Create a line path.
     */
    createLinePath(start, end) {
        // Normalize to origin
        const commands = [
            { type: 'M', x: 0, y: 0 },
            { type: 'L', x: end.x - start.x, y: end.y - start.y },
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
        this.endPoint = null;
        this.constrainAngle = false;
    }
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId() {
        return this.createdNodeId;
    }
}
/**
 * Create a line tool.
 */
export function createLineTool(options) {
    return new LineTool(options);
}
//# sourceMappingURL=line-tool.js.map