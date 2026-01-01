/**
 * Tool Manager - Manages active tools and input routing
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Tool Manager - routes input to active tool
 */
export class ToolManager extends EventEmitter {
    sceneGraph;
    viewport;
    tools = new Map();
    activeTool = null;
    previousTool = null;
    selectedNodeIds = [];
    hoveredNodeId = null;
    currentCursor = 'default';
    constructor(sceneGraph, viewport) {
        super();
        this.sceneGraph = sceneGraph;
        this.viewport = viewport;
    }
    // =========================================================================
    // Tool Registration
    // =========================================================================
    /**
     * Register a tool.
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Unregister a tool.
     */
    unregisterTool(name) {
        const tool = this.tools.get(name);
        if (tool === this.activeTool) {
            this.setActiveTool(null);
        }
        this.tools.delete(name);
    }
    /**
     * Get a tool by name.
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Get all registered tools.
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    // =========================================================================
    // Active Tool
    // =========================================================================
    /**
     * Set the active tool.
     */
    setActiveTool(toolOrName) {
        const newTool = typeof toolOrName === 'string'
            ? this.tools.get(toolOrName) ?? null
            : toolOrName;
        if (newTool === this.activeTool)
            return;
        // Deactivate current tool
        if (this.activeTool) {
            this.activeTool.deactivate?.();
        }
        this.previousTool = this.activeTool;
        this.activeTool = newTool;
        // Activate new tool
        if (this.activeTool) {
            this.activeTool.activate?.(this.getContext());
            this.setCursor(this.activeTool.cursor);
        }
        else {
            this.setCursor('default');
        }
        this.emit('tool:changed', {
            tool: this.activeTool,
            previousTool: this.previousTool,
        });
    }
    /**
     * Get the active tool.
     */
    getActiveTool() {
        return this.activeTool;
    }
    /**
     * Switch to the previous tool.
     */
    switchToPreviousTool() {
        if (this.previousTool) {
            this.setActiveTool(this.previousTool);
        }
    }
    // =========================================================================
    // Selection
    // =========================================================================
    /**
     * Get selected node IDs.
     */
    getSelectedNodeIds() {
        return this.selectedNodeIds;
    }
    /**
     * Set selected node IDs.
     */
    setSelectedNodeIds(nodeIds) {
        this.selectedNodeIds = [...nodeIds];
        this.emit('selection:changed', { nodeIds: this.selectedNodeIds });
    }
    /**
     * Add to selection.
     */
    addToSelection(nodeId) {
        if (!this.selectedNodeIds.includes(nodeId)) {
            this.selectedNodeIds.push(nodeId);
            this.emit('selection:changed', { nodeIds: this.selectedNodeIds });
        }
    }
    /**
     * Remove from selection.
     */
    removeFromSelection(nodeId) {
        const index = this.selectedNodeIds.indexOf(nodeId);
        if (index !== -1) {
            this.selectedNodeIds.splice(index, 1);
            this.emit('selection:changed', { nodeIds: this.selectedNodeIds });
        }
    }
    /**
     * Clear selection.
     */
    clearSelection() {
        if (this.selectedNodeIds.length > 0) {
            this.selectedNodeIds = [];
            this.emit('selection:changed', { nodeIds: [] });
        }
    }
    /**
     * Check if a node is selected.
     */
    isSelected(nodeId) {
        return this.selectedNodeIds.includes(nodeId);
    }
    // =========================================================================
    // Hover
    // =========================================================================
    /**
     * Get hovered node ID.
     */
    getHoveredNodeId() {
        return this.hoveredNodeId;
    }
    /**
     * Set hovered node ID.
     */
    setHoveredNodeId(nodeId) {
        if (this.hoveredNodeId !== nodeId) {
            this.hoveredNodeId = nodeId;
            this.emit('hover:changed', { nodeId });
        }
    }
    // =========================================================================
    // Cursor
    // =========================================================================
    /**
     * Get current cursor.
     */
    getCursor() {
        return this.currentCursor;
    }
    /**
     * Set cursor.
     */
    setCursor(cursor) {
        if (this.currentCursor !== cursor) {
            this.currentCursor = cursor;
            this.emit('cursor:changed', { cursor });
        }
    }
    // =========================================================================
    // Input Routing
    // =========================================================================
    /**
     * Route pointer down event.
     */
    handlePointerDown(event) {
        if (this.activeTool?.onPointerDown) {
            return this.activeTool.onPointerDown(event, this.getContext());
        }
        return false;
    }
    /**
     * Route pointer move event.
     */
    handlePointerMove(event) {
        if (this.activeTool) {
            this.activeTool.onPointerMove?.(event, this.getContext());
            // Update cursor based on position
            if (this.activeTool.getCursor) {
                const cursor = this.activeTool.getCursor({ x: event.worldX, y: event.worldY }, this.getContext());
                this.setCursor(cursor);
            }
        }
    }
    /**
     * Route pointer up event.
     */
    handlePointerUp(event) {
        this.activeTool?.onPointerUp?.(event, this.getContext());
    }
    /**
     * Route key down event.
     */
    handleKeyDown(event) {
        if (this.activeTool?.onKeyDown) {
            return this.activeTool.onKeyDown(event, this.getContext());
        }
        return false;
    }
    /**
     * Route key up event.
     */
    handleKeyUp(event) {
        this.activeTool?.onKeyUp?.(event, this.getContext());
    }
    /**
     * Route double click event.
     */
    handleDoubleClick(event) {
        this.activeTool?.onDoubleClick?.(event, this.getContext());
    }
    /**
     * Route wheel event.
     */
    handleWheel(event) {
        this.activeTool?.onWheel?.(event, this.getContext());
    }
    // =========================================================================
    // Utilities
    // =========================================================================
    /**
     * Get the current tool context.
     */
    getContext() {
        return {
            sceneGraph: this.sceneGraph,
            viewport: this.viewport,
            selectedNodeIds: this.selectedNodeIds,
            hoveredNodeId: this.hoveredNodeId,
        };
    }
    /**
     * Render tool overlays.
     */
    render(ctx) {
        this.activeTool?.render?.(ctx, this.getContext());
    }
}
/**
 * Create a tool manager.
 */
export function createToolManager(sceneGraph, viewport) {
    return new ToolManager(sceneGraph, viewport);
}
//# sourceMappingURL=tool-manager.js.map