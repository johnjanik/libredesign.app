/**
 * Resize Tool - Resize nodes by dragging handles
 */
import { BaseTool, } from '../base/tool';
/**
 * Resize Tool
 */
export class ResizeTool extends BaseTool {
    name = 'resize';
    cursor = 'default';
    handleSize;
    minSize;
    onResizeStart;
    onResizeUpdate;
    onResizeEnd;
    state = {
        isResizing: false,
        activeHandle: null,
        targetNodeId: null,
        startBounds: null,
        currentBounds: null,
        aspectRatio: null,
    };
    constructor(options = {}) {
        super();
        this.handleSize = options.handleSize ?? 8;
        this.minSize = options.minSize ?? 1;
        this.onResizeStart = options.onResizeStart;
        this.onResizeUpdate = options.onResizeUpdate;
        this.onResizeEnd = options.onResizeEnd;
    }
    activate(context) {
        super.activate(context);
        this.resetState();
    }
    deactivate() {
        super.deactivate();
        this.resetState();
    }
    resetState() {
        this.state = {
            isResizing: false,
            activeHandle: null,
            targetNodeId: null,
            startBounds: null,
            currentBounds: null,
            aspectRatio: null,
        };
    }
    onPointerDown(event, context) {
        super.onPointerDown(event, context);
        const worldPoint = { x: event.worldX, y: event.worldY };
        // Check if clicking on a resize handle
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const n = node;
                const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
                const handle = this.hitTestHandles(worldPoint, bounds);
                if (handle) {
                    this.state.isResizing = true;
                    this.state.activeHandle = handle;
                    this.state.targetNodeId = nodeId;
                    this.state.startBounds = { ...bounds };
                    this.state.currentBounds = { ...bounds };
                    this.state.aspectRatio = bounds.width / bounds.height;
                    this.onResizeStart?.(nodeId);
                    return true;
                }
            }
        }
        return false;
    }
    onPointerMove(event, _context) {
        super.onPointerMove(event, _context);
        if (!this.state.isResizing || !this.state.startBounds || !this.state.activeHandle || !this.dragStartPoint) {
            return;
        }
        const deltaX = event.worldX - this.dragStartPoint.x;
        const deltaY = event.worldY - this.dragStartPoint.y;
        const keepAspect = event.shiftKey;
        const fromCenter = event.altKey;
        const newBounds = this.calculateNewBounds(this.state.startBounds, this.state.activeHandle, deltaX, deltaY, keepAspect, fromCenter);
        this.state.currentBounds = newBounds;
        if (this.state.targetNodeId) {
            this.onResizeUpdate?.(this.state.targetNodeId, newBounds);
        }
    }
    onPointerUp(_event, _context) {
        super.onPointerUp(_event, _context);
        if (this.state.isResizing && this.state.targetNodeId && this.state.startBounds && this.state.currentBounds) {
            this.onResizeEnd?.({
                nodeId: this.state.targetNodeId,
                startBounds: this.state.startBounds,
                endBounds: this.state.currentBounds,
            });
        }
        this.resetState();
    }
    onKeyDown(event, _context) {
        if (event.key === 'Escape' && this.state.isResizing) {
            // Cancel resize
            if (this.state.targetNodeId && this.state.startBounds) {
                this.onResizeUpdate?.(this.state.targetNodeId, this.state.startBounds);
            }
            this.resetState();
            return true;
        }
        return false;
    }
    getCursor(point, context) {
        if (this.state.isResizing && this.state.activeHandle) {
            return this.getHandleCursor(this.state.activeHandle);
        }
        // Check if hovering over a handle
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const n = node;
                const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
                const handle = this.hitTestHandles(point, bounds);
                if (handle) {
                    return this.getHandleCursor(handle);
                }
            }
        }
        return 'default';
    }
    render(ctx, context) {
        // Render resize handles for selected nodes
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const n = node;
                const bounds = this.state.targetNodeId === nodeId && this.state.currentBounds
                    ? this.state.currentBounds
                    : { x: n.x, y: n.y, width: n.width, height: n.height };
                this.renderHandles(ctx, bounds);
            }
        }
        // Render resize preview
        if (this.state.isResizing && this.state.currentBounds) {
            ctx.save();
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(this.state.currentBounds.x, this.state.currentBounds.y, this.state.currentBounds.width, this.state.currentBounds.height);
            ctx.restore();
        }
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    hitTestHandles(point, bounds) {
        const handles = this.getHandlePositions(bounds);
        const halfSize = this.handleSize / 2;
        for (const [position, handlePoint] of Object.entries(handles)) {
            if (point.x >= handlePoint.x - halfSize &&
                point.x <= handlePoint.x + halfSize &&
                point.y >= handlePoint.y - halfSize &&
                point.y <= handlePoint.y + halfSize) {
                return position;
            }
        }
        return null;
    }
    getHandlePositions(bounds) {
        return {
            nw: { x: bounds.x, y: bounds.y },
            n: { x: bounds.x + bounds.width / 2, y: bounds.y },
            ne: { x: bounds.x + bounds.width, y: bounds.y },
            w: { x: bounds.x, y: bounds.y + bounds.height / 2 },
            e: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
            sw: { x: bounds.x, y: bounds.y + bounds.height },
            s: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            se: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        };
    }
    getHandleCursor(handle) {
        switch (handle) {
            case 'nw':
            case 'se':
                return 'nwse-resize';
            case 'ne':
            case 'sw':
                return 'nesw-resize';
            case 'n':
            case 's':
                return 'ns-resize';
            case 'e':
            case 'w':
                return 'ew-resize';
        }
    }
    calculateNewBounds(start, handle, deltaX, deltaY, keepAspect, fromCenter) {
        let x = start.x;
        let y = start.y;
        let width = start.width;
        let height = start.height;
        // Apply delta based on handle
        switch (handle) {
            case 'nw':
                x += deltaX;
                y += deltaY;
                width -= deltaX;
                height -= deltaY;
                break;
            case 'n':
                y += deltaY;
                height -= deltaY;
                break;
            case 'ne':
                y += deltaY;
                width += deltaX;
                height -= deltaY;
                break;
            case 'w':
                x += deltaX;
                width -= deltaX;
                break;
            case 'e':
                width += deltaX;
                break;
            case 'sw':
                x += deltaX;
                width -= deltaX;
                height += deltaY;
                break;
            case 's':
                height += deltaY;
                break;
            case 'se':
                width += deltaX;
                height += deltaY;
                break;
        }
        // Keep aspect ratio if shift is held
        if (keepAspect && this.state.aspectRatio) {
            const newAspect = width / height;
            if (newAspect > this.state.aspectRatio) {
                width = height * this.state.aspectRatio;
            }
            else {
                height = width / this.state.aspectRatio;
            }
        }
        // Resize from center if alt is held
        if (fromCenter) {
            const centerX = start.x + start.width / 2;
            const centerY = start.y + start.height / 2;
            x = centerX - width / 2;
            y = centerY - height / 2;
        }
        // Enforce minimum size
        if (width < this.minSize) {
            width = this.minSize;
            if (handle.includes('w')) {
                x = start.x + start.width - width;
            }
        }
        if (height < this.minSize) {
            height = this.minSize;
            if (handle.includes('n')) {
                y = start.y + start.height - height;
            }
        }
        return { x, y, width, height };
    }
    renderHandles(ctx, bounds) {
        const handles = this.getHandlePositions(bounds);
        const halfSize = this.handleSize / 2;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1;
        for (const point of Object.values(handles)) {
            ctx.fillRect(point.x - halfSize, point.y - halfSize, this.handleSize, this.handleSize);
            ctx.strokeRect(point.x - halfSize, point.y - halfSize, this.handleSize, this.handleSize);
        }
        ctx.restore();
    }
}
/**
 * Create a resize tool.
 */
export function createResizeTool(options) {
    return new ResizeTool(options);
}
//# sourceMappingURL=resize-tool.js.map