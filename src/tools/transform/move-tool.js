/**
 * Move Tool - Drag nodes to move them
 */
import { BaseTool, } from '../base/tool';
/**
 * Move Tool
 */
export class MoveTool extends BaseTool {
    name = 'move';
    cursor = 'move';
    gridSnap;
    onMoveStart;
    onMoveUpdate;
    onMoveEnd;
    state = {
        isMoving: false,
        startPositions: new Map(),
        lastDelta: { x: 0, y: 0 },
    };
    constructor(options = {}) {
        super();
        this.gridSnap = options.gridSnap ?? 0;
        this.onMoveStart = options.onMoveStart;
        this.onMoveUpdate = options.onMoveUpdate;
        this.onMoveEnd = options.onMoveEnd;
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
            isMoving: false,
            startPositions: new Map(),
            lastDelta: { x: 0, y: 0 },
        };
    }
    onPointerDown(event, context) {
        super.onPointerDown(event, context);
        if (context.selectedNodeIds.length === 0) {
            return false;
        }
        // Store starting positions of all selected nodes
        this.state.startPositions.clear();
        for (const nodeId of context.selectedNodeIds) {
            const node = context.sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node) {
                const n = node;
                this.state.startPositions.set(nodeId, { x: n.x, y: n.y });
            }
        }
        if (this.state.startPositions.size > 0) {
            this.state.isMoving = true;
            this.state.lastDelta = { x: 0, y: 0 };
            this.onMoveStart?.(context.selectedNodeIds.slice());
        }
        return true;
    }
    onPointerMove(event, context) {
        super.onPointerMove(event, context);
        if (!this.state.isMoving || !this.dragStartPoint) {
            return;
        }
        // Calculate delta from drag start
        let deltaX = event.worldX - this.dragStartPoint.x;
        let deltaY = event.worldY - this.dragStartPoint.y;
        // Apply grid snapping
        if (this.gridSnap > 0) {
            deltaX = Math.round(deltaX / this.gridSnap) * this.gridSnap;
            deltaY = Math.round(deltaY / this.gridSnap) * this.gridSnap;
        }
        // Apply constraints
        if (event.shiftKey) {
            // Constrain to horizontal or vertical movement
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                deltaY = 0;
            }
            else {
                deltaX = 0;
            }
        }
        this.state.lastDelta = { x: deltaX, y: deltaY };
        this.onMoveUpdate?.(context.selectedNodeIds.slice(), this.state.lastDelta);
    }
    onPointerUp(_event, context) {
        super.onPointerUp(_event, context);
        if (this.state.isMoving) {
            // Generate move operations for undo
            const operations = [];
            for (const [nodeId, startPos] of this.state.startPositions) {
                operations.push({
                    nodeId,
                    startX: startPos.x,
                    startY: startPos.y,
                    endX: startPos.x + this.state.lastDelta.x,
                    endY: startPos.y + this.state.lastDelta.y,
                });
            }
            this.onMoveEnd?.(operations);
        }
        this.resetState();
    }
    onKeyDown(event, context) {
        // Arrow key nudging
        const nudgeAmount = event.shiftKey ? 10 : 1;
        let delta = null;
        switch (event.key) {
            case 'ArrowUp':
                delta = { x: 0, y: -nudgeAmount };
                break;
            case 'ArrowDown':
                delta = { x: 0, y: nudgeAmount };
                break;
            case 'ArrowLeft':
                delta = { x: -nudgeAmount, y: 0 };
                break;
            case 'ArrowRight':
                delta = { x: nudgeAmount, y: 0 };
                break;
        }
        if (delta && context.selectedNodeIds.length > 0) {
            // Create operations for nudge
            const operations = [];
            for (const nodeId of context.selectedNodeIds) {
                const node = context.sceneGraph.getNode(nodeId);
                if (node && 'x' in node && 'y' in node) {
                    const n = node;
                    operations.push({
                        nodeId,
                        startX: n.x,
                        startY: n.y,
                        endX: n.x + delta.x,
                        endY: n.y + delta.y,
                    });
                }
            }
            this.onMoveEnd?.(operations);
            return true;
        }
        return false;
    }
    getCursor(_point, context) {
        if (this.state.isMoving) {
            return 'grabbing';
        }
        return context.selectedNodeIds.length > 0 ? 'move' : 'default';
    }
    render(ctx, context) {
        // Render move preview (nodes at new position)
        if (this.state.isMoving) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            for (const nodeId of context.selectedNodeIds) {
                const node = context.sceneGraph.getNode(nodeId);
                if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                    const n = node;
                    const startPos = this.state.startPositions.get(nodeId);
                    if (startPos) {
                        const newX = startPos.x + this.state.lastDelta.x;
                        const newY = startPos.y + this.state.lastDelta.y;
                        ctx.strokeStyle = '#0066ff';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 4]);
                        ctx.strokeRect(newX, newY, n.width, n.height);
                    }
                }
            }
            ctx.restore();
        }
    }
}
/**
 * Create a move tool.
 */
export function createMoveTool(options) {
    return new MoveTool(options);
}
//# sourceMappingURL=move-tool.js.map