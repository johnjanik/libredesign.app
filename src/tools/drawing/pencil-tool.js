/**
 * Pencil Tool (Freehand Drawing)
 *
 * Creates freehand paths by drawing.
 * Supports:
 * - Smooth path generation with curve fitting
 * - Pressure sensitivity (if available)
 * - Path simplification to reduce points
 */
import { BaseTool } from '../base/tool';
const DEFAULT_OPTIONS = {
    minDistance: 2,
    smoothing: 0.3,
    simplifyTolerance: 1,
    strokeColor: { r: 0, g: 0, b: 0, a: 1 },
    strokeWeight: 2,
};
/**
 * Pencil tool for freehand drawing
 */
export class PencilTool extends BaseTool {
    name = 'pencil';
    cursor = 'crosshair';
    options;
    rawPoints = [];
    isDrawing = false;
    createdNodeId = null;
    // Callbacks
    onPathComplete;
    onPreviewUpdate;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Set callback for when path is completed.
     */
    setOnPathComplete(callback) {
        this.onPathComplete = callback;
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
    getIsDrawing() {
        return this.isDrawing;
    }
    /**
     * Get current raw points.
     */
    getRawPoints() {
        return this.rawPoints;
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
        this.isDrawing = true;
        this.rawPoints = [{ x: event.worldX, y: event.worldY }];
        return true;
    }
    onPointerMove(event, context) {
        if (!this.isDrawing)
            return;
        const newPoint = { x: event.worldX, y: event.worldY };
        const lastPoint = this.rawPoints[this.rawPoints.length - 1];
        if (lastPoint) {
            const dx = newPoint.x - lastPoint.x;
            const dy = newPoint.y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Only add point if it's far enough from the last one
            const minDist = this.options.minDistance / context.viewport.getZoom();
            if (distance >= minDist) {
                this.rawPoints.push(newPoint);
                this.onPreviewUpdate?.();
            }
        }
    }
    onPointerUp(_event, _context) {
        if (!this.isDrawing)
            return;
        // Need at least 2 points to create a path
        if (this.rawPoints.length >= 2) {
            const data = this.generateFreehandData();
            if (this.onPathComplete) {
                this.createdNodeId = this.onPathComplete(data);
            }
        }
        this.reset();
        this.onPreviewUpdate?.();
    }
    onKeyDown(event, _context) {
        if (event.key === 'Escape' && this.isDrawing) {
            this.reset();
            this.onPreviewUpdate?.();
            return true;
        }
        return false;
    }
    render(ctx, context) {
        if (!this.isDrawing || this.rawPoints.length < 2)
            return;
        const viewport = context.viewport;
        ctx.save();
        // Draw the freehand path preview
        ctx.beginPath();
        ctx.moveTo(this.rawPoints[0].x, this.rawPoints[0].y);
        for (let i = 1; i < this.rawPoints.length; i++) {
            ctx.lineTo(this.rawPoints[i].x, this.rawPoints[i].y);
        }
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = this.options.strokeWeight / viewport.getZoom();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
    }
    /**
     * Generate freehand data from raw points.
     */
    generateFreehandData() {
        // Simplify the path using Douglas-Peucker algorithm
        const simplified = this.simplifyPath(this.rawPoints, this.options.simplifyTolerance);
        // Smooth the simplified path
        const smoothed = this.smoothPath(simplified, this.options.smoothing);
        // Generate vector path with cubic bezier curves
        const path = this.generatePath(smoothed);
        // Calculate bounds
        const bounds = this.calculateBounds(smoothed);
        return {
            rawPoints: [...this.rawPoints],
            smoothedPoints: smoothed,
            path,
            bounds,
        };
    }
    /**
     * Simplify path using Douglas-Peucker algorithm.
     */
    simplifyPath(points, tolerance) {
        if (points.length <= 2)
            return [...points];
        // Find the point with maximum distance from line
        const first = points[0];
        const last = points[points.length - 1];
        let maxDistance = 0;
        let maxIndex = 0;
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.pointLineDistance(points[i], first, last);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        // If max distance > tolerance, recursively simplify
        if (maxDistance > tolerance) {
            const left = this.simplifyPath(points.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPath(points.slice(maxIndex), tolerance);
            return [...left.slice(0, -1), ...right];
        }
        else {
            return [first, last];
        }
    }
    /**
     * Calculate perpendicular distance from point to line.
     */
    pointLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const lineLengthSq = dx * dx + dy * dy;
        if (lineLengthSq === 0) {
            // Line is a point
            return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
        }
        const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq));
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    }
    /**
     * Smooth path using Chaikin's algorithm.
     */
    smoothPath(points, smoothing) {
        if (points.length <= 2 || smoothing === 0)
            return [...points];
        const iterations = Math.ceil(smoothing * 3);
        let result = [...points];
        for (let iter = 0; iter < iterations; iter++) {
            const newPoints = [result[0]];
            for (let i = 0; i < result.length - 1; i++) {
                const p0 = result[i];
                const p1 = result[i + 1];
                // Chaikin's corner cutting
                const q = {
                    x: 0.75 * p0.x + 0.25 * p1.x,
                    y: 0.75 * p0.y + 0.25 * p1.y,
                };
                const r = {
                    x: 0.25 * p0.x + 0.75 * p1.x,
                    y: 0.25 * p0.y + 0.75 * p1.y,
                };
                newPoints.push(q, r);
            }
            newPoints.push(result[result.length - 1]);
            result = newPoints;
        }
        return result;
    }
    /**
     * Generate cubic bezier path from points.
     */
    generatePath(points) {
        if (points.length === 0) {
            return { windingRule: 'NONZERO', commands: [] };
        }
        if (points.length === 1) {
            return {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: points[0].x, y: points[0].y },
                ],
            };
        }
        if (points.length === 2) {
            return {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: points[0].x, y: points[0].y },
                    { type: 'L', x: points[1].x, y: points[1].y },
                ],
            };
        }
        // Generate smooth cubic beziers using Catmull-Rom to Bezier conversion
        const commands = [
            { type: 'M', x: points[0].x, y: points[0].y },
        ];
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            // Catmull-Rom to Bezier
            const tension = 0.5;
            const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
            const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
            const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
            const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
            commands.push({
                type: 'C',
                x1: cp1x,
                y1: cp1y,
                x2: cp2x,
                y2: cp2y,
                x: p2.x,
                y: p2.y,
            });
        }
        return { windingRule: 'NONZERO', commands };
    }
    /**
     * Calculate bounding box of points.
     */
    calculateBounds(points) {
        if (points.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return {
            x: minX,
            y: minY,
            width: Math.max(maxX - minX, 1),
            height: Math.max(maxY - minY, 1),
        };
    }
    /**
     * Reset the tool state.
     */
    reset() {
        this.isDrawing = false;
        this.rawPoints = [];
    }
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId() {
        return this.createdNodeId;
    }
}
/**
 * Create a pencil tool.
 */
export function createPencilTool(options) {
    return new PencilTool(options);
}
//# sourceMappingURL=pencil-tool.js.map