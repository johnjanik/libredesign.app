/**
 * Rotate Tool - Rotate nodes by dragging
 */
import { BaseTool, } from '../base/tool';
/**
 * Rotate Tool
 */
export class RotateTool extends BaseTool {
    name = 'rotate';
    cursor = 'default';
    snapAngle;
    handleOffset;
    onRotateStart;
    onRotateUpdate;
    onRotateEnd;
    state = {
        isRotating: false,
        targetNodeId: null,
        startAngle: 0,
        startRotation: 0,
        currentRotation: 0,
        pivot: null,
    };
    constructor(options = {}) {
        super();
        this.snapAngle = options.snapAngle ?? 0;
        this.handleOffset = options.handleOffset ?? 20;
        this.onRotateStart = options.onRotateStart;
        this.onRotateUpdate = options.onRotateUpdate;
        this.onRotateEnd = options.onRotateEnd;
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
            isRotating: false,
            targetNodeId: null,
            startAngle: 0,
            startRotation: 0,
            currentRotation: 0,
            pivot: null,
        };
    }
    onPointerDown(event, context) {
        super.onPointerDown(event, context);
        const worldPoint = { x: event.worldX, y: event.worldY };
        // Check if clicking on a rotation handle
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const n = node;
                const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
                const rotation = n.rotation ?? 0;
                if (this.hitTestRotationZone(worldPoint, bounds)) {
                    const pivot = {
                        x: bounds.x + bounds.width / 2,
                        y: bounds.y + bounds.height / 2,
                    };
                    this.state.isRotating = true;
                    this.state.targetNodeId = nodeId;
                    this.state.pivot = pivot;
                    this.state.startAngle = this.getAngle(worldPoint, pivot);
                    this.state.startRotation = rotation;
                    this.state.currentRotation = rotation;
                    this.onRotateStart?.(nodeId);
                    return true;
                }
            }
        }
        return false;
    }
    onPointerMove(event, _context) {
        super.onPointerMove(event, _context);
        if (!this.state.isRotating || !this.state.pivot) {
            return;
        }
        const worldPoint = { x: event.worldX, y: event.worldY };
        const currentAngle = this.getAngle(worldPoint, this.state.pivot);
        let deltaAngle = currentAngle - this.state.startAngle;
        // Normalize delta
        while (deltaAngle > 180)
            deltaAngle -= 360;
        while (deltaAngle < -180)
            deltaAngle += 360;
        let newRotation = this.state.startRotation + deltaAngle;
        // Apply snap
        if (this.snapAngle > 0 && !event.shiftKey) {
            newRotation = Math.round(newRotation / this.snapAngle) * this.snapAngle;
        }
        // Constrain to 45-degree increments when shift is held
        if (event.shiftKey) {
            newRotation = Math.round(newRotation / 45) * 45;
        }
        // Normalize to 0-360
        while (newRotation < 0)
            newRotation += 360;
        while (newRotation >= 360)
            newRotation -= 360;
        this.state.currentRotation = newRotation;
        if (this.state.targetNodeId && this.state.pivot) {
            this.onRotateUpdate?.(this.state.targetNodeId, newRotation, this.state.pivot);
        }
    }
    onPointerUp(_event, _context) {
        super.onPointerUp(_event, _context);
        if (this.state.isRotating && this.state.targetNodeId && this.state.pivot) {
            this.onRotateEnd?.({
                nodeId: this.state.targetNodeId,
                startRotation: this.state.startRotation,
                endRotation: this.state.currentRotation,
                pivotX: this.state.pivot.x,
                pivotY: this.state.pivot.y,
            });
        }
        this.resetState();
    }
    onKeyDown(event, _context) {
        if (event.key === 'Escape' && this.state.isRotating) {
            // Cancel rotation
            if (this.state.targetNodeId && this.state.pivot) {
                this.onRotateUpdate?.(this.state.targetNodeId, this.state.startRotation, this.state.pivot);
            }
            this.resetState();
            return true;
        }
        return false;
    }
    getCursor(point, context) {
        if (this.state.isRotating) {
            return 'grabbing';
        }
        // Check if hovering over rotation zone
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const n = node;
                const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
                if (this.hitTestRotationZone(point, bounds)) {
                    return 'rotate';
                }
            }
        }
        return 'default';
    }
    render(ctx, context) {
        // Render rotation handles for selected nodes
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const n = node;
                const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
                this.renderRotationHandles(ctx, bounds);
            }
        }
        // Render rotation preview
        if (this.state.isRotating && this.state.pivot) {
            ctx.save();
            // Draw rotation line from center to cursor
            ctx.beginPath();
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.moveTo(this.state.pivot.x, this.state.pivot.y);
            if (this.lastPoint) {
                ctx.lineTo(this.lastPoint.x, this.lastPoint.y);
            }
            ctx.stroke();
            // Draw rotation angle indicator
            const angle = this.state.currentRotation;
            ctx.fillStyle = '#0066ff';
            ctx.font = '12px sans-serif';
            ctx.fillText(`${angle.toFixed(1)}°`, this.state.pivot.x + 10, this.state.pivot.y - 10);
            ctx.restore();
        }
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    getAngle(point, pivot) {
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }
    hitTestRotationZone(point, bounds) {
        // Rotation zone is outside the bounding box corners
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height },
        ];
        const innerOffset = 8; // Distance inside the corner where resize handles are
        const outerOffset = this.handleOffset;
        for (const corner of corners) {
            const dist = Math.sqrt(Math.pow(point.x - corner.x, 2) + Math.pow(point.y - corner.y, 2));
            // Check if point is in the rotation zone (between inner and outer ring)
            if (dist > innerOffset && dist < outerOffset) {
                return true;
            }
        }
        return false;
    }
    renderRotationHandles(ctx, bounds) {
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height },
        ];
        ctx.save();
        // Draw rotation hint circles at corners
        ctx.strokeStyle = 'rgba(0, 102, 255, 0.3)';
        ctx.lineWidth = 2;
        for (const corner of corners) {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, this.handleOffset, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Draw center point
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
/**
 * Create a rotate tool.
 */
export function createRotateTool(options) {
    return new RotateTool(options);
}
//# sourceMappingURL=rotate-tool.js.map