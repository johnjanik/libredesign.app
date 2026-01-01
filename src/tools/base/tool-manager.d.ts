/**
 * Tool Manager - Manages active tools and input routing
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { Viewport } from '@renderer/core/viewport';
import { EventEmitter } from '@core/events/event-emitter';
import type { Tool, ToolCursor, PointerEventData, KeyEventData } from './tool';
/**
 * Tool manager events
 */
export type ToolManagerEvents = {
    'tool:changed': {
        tool: Tool;
        previousTool: Tool | null;
    };
    'cursor:changed': {
        cursor: ToolCursor;
    };
    'selection:changed': {
        nodeIds: NodeId[];
    };
    'hover:changed': {
        nodeId: NodeId | null;
    };
    [key: string]: unknown;
};
/**
 * Tool Manager - routes input to active tool
 */
export declare class ToolManager extends EventEmitter<ToolManagerEvents> {
    private sceneGraph;
    private viewport;
    private tools;
    private activeTool;
    private previousTool;
    private selectedNodeIds;
    private hoveredNodeId;
    private currentCursor;
    constructor(sceneGraph: SceneGraph, viewport: Viewport);
    /**
     * Register a tool.
     */
    registerTool(tool: Tool): void;
    /**
     * Unregister a tool.
     */
    unregisterTool(name: string): void;
    /**
     * Get a tool by name.
     */
    getTool(name: string): Tool | undefined;
    /**
     * Get all registered tools.
     */
    getAllTools(): readonly Tool[];
    /**
     * Set the active tool.
     */
    setActiveTool(toolOrName: Tool | string | null): void;
    /**
     * Get the active tool.
     */
    getActiveTool(): Tool | null;
    /**
     * Switch to the previous tool.
     */
    switchToPreviousTool(): void;
    /**
     * Get selected node IDs.
     */
    getSelectedNodeIds(): readonly NodeId[];
    /**
     * Set selected node IDs.
     */
    setSelectedNodeIds(nodeIds: NodeId[]): void;
    /**
     * Add to selection.
     */
    addToSelection(nodeId: NodeId): void;
    /**
     * Remove from selection.
     */
    removeFromSelection(nodeId: NodeId): void;
    /**
     * Clear selection.
     */
    clearSelection(): void;
    /**
     * Check if a node is selected.
     */
    isSelected(nodeId: NodeId): boolean;
    /**
     * Get hovered node ID.
     */
    getHoveredNodeId(): NodeId | null;
    /**
     * Set hovered node ID.
     */
    setHoveredNodeId(nodeId: NodeId | null): void;
    /**
     * Get current cursor.
     */
    getCursor(): ToolCursor;
    /**
     * Set cursor.
     */
    setCursor(cursor: ToolCursor): void;
    /**
     * Route pointer down event.
     */
    handlePointerDown(event: PointerEventData): boolean;
    /**
     * Route pointer move event.
     */
    handlePointerMove(event: PointerEventData): void;
    /**
     * Route pointer up event.
     */
    handlePointerUp(event: PointerEventData): void;
    /**
     * Route key down event.
     */
    handleKeyDown(event: KeyEventData): boolean;
    /**
     * Route key up event.
     */
    handleKeyUp(event: KeyEventData): void;
    /**
     * Route double click event.
     */
    handleDoubleClick(event: PointerEventData): void;
    /**
     * Route wheel event.
     */
    handleWheel(event: WheelEvent): void;
    /**
     * Get the current tool context.
     */
    private getContext;
    /**
     * Render tool overlays.
     */
    render(ctx: CanvasRenderingContext2D): void;
}
/**
 * Create a tool manager.
 */
export declare function createToolManager(sceneGraph: SceneGraph, viewport: Viewport): ToolManager;
//# sourceMappingURL=tool-manager.d.ts.map