/**
 * Pen Tool
 *
 * Creates vector paths by placing anchor points and bezier control handles.
 * Supports:
 * - Click to add corner points
 * - Click + drag to add smooth points with handles
 * - Click on first point to close path
 * - Escape to finish open path
 * - Backspace to remove last point
 */
import { BaseTool } from '../base/tool';
import { createPathBuilder } from './path-builder';
const DEFAULT_OPTIONS = {
    closeThreshold: 10,
    handleThreshold: 5,
    strokeColor: { r: 0, g: 0, b: 0, a: 1 },
    strokeWidth: 1,
    fillColor: null,
};
/**
 * Pen tool for creating vector paths
 */
export class PenTool extends BaseTool {
    name = 'pen';
    cursor = 'crosshair';
    options;
    state = 'IDLE';
    pathBuilder;
    anchorPosition = null;
    handlePosition = null;
    createdNodeId = null;
    // Callbacks
    onPathComplete;
    onPreviewUpdate;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.pathBuilder = createPathBuilder();
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
     * Get current tool state.
     */
    getState() {
        return this.state;
    }
    /**
     * Get the path builder for preview rendering.
     */
    getPathBuilder() {
        return this.pathBuilder;
    }
    /**
     * Get current anchor position (for preview).
     */
    getAnchorPosition() {
        return this.anchorPosition;
    }
    /**
     * Get current handle position (for preview).
     */
    getHandlePosition() {
        return this.handlePosition;
    }
    /**
     * Check if the tool is currently drawing.
     */
    isDrawing() {
        return this.pathBuilder.anchorCount > 0;
    }
    activate(context) {
        super.activate(context);
        this.reset();
    }
    deactivate() {
        // Finish any in-progress path
        if (this.pathBuilder.anchorCount > 0) {
            this.finishPath();
        }
        this.reset();
        super.deactivate();
    }
    onPointerDown(event, context) {
        const worldPoint = { x: event.worldX, y: event.worldY };
        // Check if clicking near first anchor to close
        if (this.pathBuilder.anchorCount >= 2) {
            const screenThreshold = this.options.closeThreshold / context.viewport.getZoom();
            if (this.pathBuilder.isNearFirstAnchor(worldPoint, screenThreshold)) {
                this.closePath();
                return true;
            }
        }
        // Start placing a new anchor
        this.state = 'PLACING_ANCHOR';
        this.anchorPosition = worldPoint;
        this.handlePosition = null;
        return true;
    }
    onPointerMove(event, context) {
        const worldPoint = { x: event.worldX, y: event.worldY };
        if (this.state === 'PLACING_ANCHOR' && this.anchorPosition) {
            // Check if dragging far enough to create handles
            const dx = worldPoint.x - this.anchorPosition.x;
            const dy = worldPoint.y - this.anchorPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const screenThreshold = this.options.handleThreshold / context.viewport.getZoom();
            if (distance > screenThreshold) {
                this.state = 'DRAGGING_HANDLE';
                this.handlePosition = worldPoint;
            }
        }
        else if (this.state === 'DRAGGING_HANDLE') {
            this.handlePosition = worldPoint;
        }
        // Update cursor based on position
        if (this.pathBuilder.anchorCount >= 2) {
            const screenThreshold = this.options.closeThreshold / context.viewport.getZoom();
            if (this.pathBuilder.isNearFirstAnchor(worldPoint, screenThreshold)) {
                this.cursor = 'pointer';
            }
            else {
                this.cursor = 'crosshair';
            }
        }
        this.onPreviewUpdate?.();
    }
    onPointerUp(_event, _context) {
        if (!this.anchorPosition)
            return;
        if (this.state === 'DRAGGING_HANDLE' && this.handlePosition) {
            // Add smooth anchor with handles
            this.pathBuilder.addSmooth(this.anchorPosition, this.handlePosition);
        }
        else {
            // Add corner anchor
            this.pathBuilder.addCorner(this.anchorPosition);
        }
        // Reset state
        this.state = 'IDLE';
        this.anchorPosition = null;
        this.handlePosition = null;
        this.onPreviewUpdate?.();
    }
    onKeyDown(event, _context) {
        switch (event.key) {
            case 'Escape':
                if (this.pathBuilder.anchorCount > 0) {
                    this.finishPath();
                    return true;
                }
                break;
            case 'Backspace':
            case 'Delete':
                if (this.pathBuilder.anchorCount > 0) {
                    this.pathBuilder.removeLastAnchor();
                    this.onPreviewUpdate?.();
                    return true;
                }
                break;
            case 'Enter':
                if (this.pathBuilder.anchorCount >= 2) {
                    this.closePath();
                    return true;
                }
                break;
        }
        return false;
    }
    onDoubleClick(_event, _context) {
        // Double-click finishes the path
        if (this.pathBuilder.anchorCount > 0) {
            this.finishPath();
        }
    }
    getCursor(point, context) {
        if (this.pathBuilder.anchorCount >= 2) {
            const screenThreshold = this.options.closeThreshold / context.viewport.getZoom();
            if (this.pathBuilder.isNearFirstAnchor(point, screenThreshold)) {
                return 'pointer';
            }
        }
        return 'crosshair';
    }
    render(ctx, context) {
        const builderState = this.pathBuilder.getState();
        if (builderState.anchors.length === 0 && !this.anchorPosition)
            return;
        const viewport = context.viewport;
        ctx.save();
        // Canvas container already applies viewport transform, so we render in world coords
        // Draw existing path segments
        if (builderState.anchors.length > 0) {
            ctx.beginPath();
            const first = builderState.anchors[0];
            ctx.moveTo(first.position.x, first.position.y);
            for (let i = 1; i < builderState.anchors.length; i++) {
                const prev = builderState.anchors[i - 1];
                const curr = builderState.anchors[i];
                if (prev.handleOut && curr.handleIn) {
                    ctx.bezierCurveTo(prev.handleOut.x, prev.handleOut.y, curr.handleIn.x, curr.handleIn.y, curr.position.x, curr.position.y);
                }
                else {
                    ctx.lineTo(curr.position.x, curr.position.y);
                }
            }
            ctx.strokeStyle = '#0066FF';
            ctx.lineWidth = 2 / viewport.getZoom();
            ctx.stroke();
        }
        // Draw preview segment to current position
        if (builderState.anchors.length > 0 && (this.anchorPosition || this.handlePosition)) {
            const last = builderState.anchors[builderState.anchors.length - 1];
            const target = this.anchorPosition ?? this.handlePosition;
            if (target) {
                ctx.beginPath();
                ctx.moveTo(last.position.x, last.position.y);
                if (last.handleOut) {
                    ctx.bezierCurveTo(last.handleOut.x, last.handleOut.y, target.x, target.y, target.x, target.y);
                }
                else {
                    ctx.lineTo(target.x, target.y);
                }
                ctx.strokeStyle = '#0066FF';
                ctx.lineWidth = 1 / viewport.getZoom();
                ctx.setLineDash([4 / viewport.getZoom(), 4 / viewport.getZoom()]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        // Draw anchor points
        const pointRadius = 4 / viewport.getZoom();
        for (const anchor of builderState.anchors) {
            ctx.beginPath();
            ctx.arc(anchor.position.x, anchor.position.y, pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#0066FF';
            ctx.lineWidth = 1.5 / viewport.getZoom();
            ctx.stroke();
            // Draw handles
            if (anchor.handleOut) {
                ctx.beginPath();
                ctx.moveTo(anchor.position.x, anchor.position.y);
                ctx.lineTo(anchor.handleOut.x, anchor.handleOut.y);
                ctx.strokeStyle = '#888888';
                ctx.lineWidth = 1 / viewport.getZoom();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(anchor.handleOut.x, anchor.handleOut.y, pointRadius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#888888';
                ctx.fill();
            }
            if (anchor.handleIn) {
                ctx.beginPath();
                ctx.moveTo(anchor.position.x, anchor.position.y);
                ctx.lineTo(anchor.handleIn.x, anchor.handleIn.y);
                ctx.strokeStyle = '#888888';
                ctx.lineWidth = 1 / viewport.getZoom();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(anchor.handleIn.x, anchor.handleIn.y, pointRadius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#888888';
                ctx.fill();
            }
        }
        // Draw current anchor being placed
        if (this.anchorPosition) {
            ctx.beginPath();
            ctx.arc(this.anchorPosition.x, this.anchorPosition.y, pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#0066FF';
            ctx.fill();
            // Draw handle being dragged
            if (this.handlePosition) {
                ctx.beginPath();
                ctx.moveTo(this.anchorPosition.x, this.anchorPosition.y);
                ctx.lineTo(this.handlePosition.x, this.handlePosition.y);
                ctx.strokeStyle = '#0066FF';
                ctx.lineWidth = 1 / viewport.getZoom();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(this.handlePosition.x, this.handlePosition.y, pointRadius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#0066FF';
                ctx.fill();
                // Draw symmetric handle
                const symX = this.anchorPosition.x - (this.handlePosition.x - this.anchorPosition.x);
                const symY = this.anchorPosition.y - (this.handlePosition.y - this.anchorPosition.y);
                ctx.beginPath();
                ctx.moveTo(this.anchorPosition.x, this.anchorPosition.y);
                ctx.lineTo(symX, symY);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(symX, symY, pointRadius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
    /**
     * Close the current path.
     */
    closePath() {
        try {
            this.pathBuilder.close();
            this.finishPath();
        }
        catch {
            // Not enough anchors to close
        }
    }
    /**
     * Finish and emit the current path.
     */
    finishPath() {
        if (this.pathBuilder.anchorCount === 0)
            return;
        const path = this.pathBuilder.build();
        if (this.onPathComplete) {
            this.createdNodeId = this.onPathComplete(path);
        }
        this.reset();
        this.onPreviewUpdate?.();
    }
    /**
     * Reset the tool state.
     */
    reset() {
        this.pathBuilder.clear();
        this.state = 'IDLE';
        this.anchorPosition = null;
        this.handlePosition = null;
        this.createdNodeId = null;
    }
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId() {
        return this.createdNodeId;
    }
}
/**
 * Create a pen tool.
 */
export function createPenTool(options) {
    return new PenTool(options);
}
//# sourceMappingURL=pen-tool.js.map