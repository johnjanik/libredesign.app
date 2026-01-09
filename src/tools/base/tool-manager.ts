/**
 * Tool Manager - Manages active tools and input routing
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { Viewport } from '@renderer/core/viewport';
import { EventEmitter } from '@core/events/event-emitter';
import type { Tool, ToolContext, ToolCursor, PointerEventData, KeyEventData, SnapContext } from './tool';

/**
 * Tool manager events
 */
export type ToolManagerEvents = {
  'tool:changed': { tool: Tool; previousTool: Tool | null };
  'cursor:changed': { cursor: ToolCursor };
  'selection:changed': { nodeIds: NodeId[] };
  'hover:changed': { nodeId: NodeId | null };
  [key: string]: unknown;
};

/**
 * Tool Manager - routes input to active tool
 */
export class ToolManager extends EventEmitter<ToolManagerEvents> {
  private sceneGraph: SceneGraph;
  private viewport: Viewport;
  private tools: Map<string, Tool> = new Map();
  private activeTool: Tool | null = null;
  private previousTool: Tool | null = null;
  private selectedNodeIds: NodeId[] = [];
  private hoveredNodeId: NodeId | null = null;
  private currentCursor: ToolCursor = 'default';
  private snapContext: SnapContext | null = null;

  // Grid snapping settings
  private snapToGrid: boolean = true;
  private gridSize: number = 8;

  constructor(sceneGraph: SceneGraph, viewport: Viewport) {
    super();
    this.sceneGraph = sceneGraph;
    this.viewport = viewport;

    // Load grid settings from localStorage
    this.loadGridSettings();
  }

  /**
   * Set the snap context for snap-to functionality.
   */
  setSnapContext(snapContext: SnapContext | null): void {
    this.snapContext = snapContext;
  }

  /**
   * Get the current snap context.
   */
  getSnapContext(): SnapContext | null {
    return this.snapContext;
  }

  private loadGridSettings(): void {
    try {
      const snapSetting = localStorage.getItem('designlibre-snap-to-grid');
      if (snapSetting !== null) {
        this.snapToGrid = snapSetting === 'true';
      }
      const sizeSetting = localStorage.getItem('designlibre-grid-size');
      if (sizeSetting !== null) {
        this.gridSize = parseInt(sizeSetting, 10) || 8;
      }
    } catch {
      // localStorage not available
    }
  }

  // =========================================================================
  // Tool Registration
  // =========================================================================

  /**
   * Register a tool.
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool.
   */
  unregisterTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool === this.activeTool) {
      this.setActiveTool(null);
    }
    this.tools.delete(name);
  }

  /**
   * Get a tool by name.
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools.
   */
  getAllTools(): readonly Tool[] {
    return Array.from(this.tools.values());
  }

  // =========================================================================
  // Active Tool
  // =========================================================================

  /**
   * Set the active tool.
   */
  setActiveTool(toolOrName: Tool | string | null): void {
    const newTool = typeof toolOrName === 'string'
      ? this.tools.get(toolOrName) ?? null
      : toolOrName;

    if (newTool === this.activeTool) return;

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
    } else {
      this.setCursor('default');
    }

    this.emit('tool:changed', {
      tool: this.activeTool!,
      previousTool: this.previousTool,
    });
  }

  /**
   * Get the active tool.
   */
  getActiveTool(): Tool | null {
    return this.activeTool;
  }

  /**
   * Switch to the previous tool.
   */
  switchToPreviousTool(): void {
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
  getSelectedNodeIds(): readonly NodeId[] {
    return this.selectedNodeIds;
  }

  /**
   * Set selected node IDs.
   */
  setSelectedNodeIds(nodeIds: NodeId[]): void {
    this.selectedNodeIds = [...nodeIds];
    this.emit('selection:changed', { nodeIds: this.selectedNodeIds });
  }

  /**
   * Add to selection.
   */
  addToSelection(nodeId: NodeId): void {
    if (!this.selectedNodeIds.includes(nodeId)) {
      this.selectedNodeIds.push(nodeId);
      this.emit('selection:changed', { nodeIds: this.selectedNodeIds });
    }
  }

  /**
   * Remove from selection.
   */
  removeFromSelection(nodeId: NodeId): void {
    const index = this.selectedNodeIds.indexOf(nodeId);
    if (index !== -1) {
      this.selectedNodeIds.splice(index, 1);
      this.emit('selection:changed', { nodeIds: this.selectedNodeIds });
    }
  }

  /**
   * Clear selection.
   */
  clearSelection(): void {
    if (this.selectedNodeIds.length > 0) {
      this.selectedNodeIds = [];
      this.emit('selection:changed', { nodeIds: [] });
    }
  }

  /**
   * Check if a node is selected.
   */
  isSelected(nodeId: NodeId): boolean {
    return this.selectedNodeIds.includes(nodeId);
  }

  // =========================================================================
  // Hover
  // =========================================================================

  /**
   * Get hovered node ID.
   */
  getHoveredNodeId(): NodeId | null {
    return this.hoveredNodeId;
  }

  /**
   * Set hovered node ID.
   */
  setHoveredNodeId(nodeId: NodeId | null): void {
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
  getCursor(): ToolCursor {
    return this.currentCursor;
  }

  /**
   * Set cursor.
   */
  setCursor(cursor: ToolCursor): void {
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
  handlePointerDown(event: PointerEventData): boolean {
    if (this.activeTool?.onPointerDown) {
      return this.activeTool.onPointerDown(event, this.getContext());
    }
    return false;
  }

  /**
   * Route pointer move event.
   */
  handlePointerMove(event: PointerEventData): void {
    if (this.activeTool) {
      this.activeTool.onPointerMove?.(event, this.getContext());

      // Update cursor based on position
      if (this.activeTool.getCursor) {
        const cursor = this.activeTool.getCursor(
          { x: event.worldX, y: event.worldY },
          this.getContext()
        );
        this.setCursor(cursor);
      }
    }
  }

  /**
   * Route pointer up event.
   */
  handlePointerUp(event: PointerEventData): void {
    this.activeTool?.onPointerUp?.(event, this.getContext());
  }

  /**
   * Route key down event.
   */
  handleKeyDown(event: KeyEventData): boolean {
    if (this.activeTool?.onKeyDown) {
      return this.activeTool.onKeyDown(event, this.getContext());
    }
    return false;
  }

  /**
   * Route key up event.
   */
  handleKeyUp(event: KeyEventData): void {
    this.activeTool?.onKeyUp?.(event, this.getContext());
  }

  /**
   * Route double click event.
   */
  handleDoubleClick(event: PointerEventData): void {
    this.activeTool?.onDoubleClick?.(event, this.getContext());
  }

  /**
   * Route wheel event.
   */
  handleWheel(event: WheelEvent): void {
    this.activeTool?.onWheel?.(event, this.getContext());
  }

  // =========================================================================
  // Grid Snapping
  // =========================================================================

  /**
   * Get whether snap to grid is enabled.
   */
  getSnapToGrid(): boolean {
    return this.snapToGrid;
  }

  /**
   * Set whether snap to grid is enabled.
   */
  setSnapToGrid(enabled: boolean): void {
    this.snapToGrid = enabled;
    try {
      localStorage.setItem('designlibre-snap-to-grid', String(enabled));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get the grid size.
   */
  getGridSize(): number {
    return this.gridSize;
  }

  /**
   * Set the grid size.
   */
  setGridSize(size: number): void {
    this.gridSize = Math.max(1, size);
    try {
      localStorage.setItem('designlibre-grid-size', String(this.gridSize));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Snap a value to the grid.
   */
  snapToGridValue(value: number): number {
    if (!this.snapToGrid) return value;
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Get the current tool context.
   */
  private getContext(): ToolContext {
    const context: ToolContext = {
      sceneGraph: this.sceneGraph,
      viewport: this.viewport,
      selectedNodeIds: this.selectedNodeIds,
      hoveredNodeId: this.hoveredNodeId,
    };
    if (this.snapContext) {
      (context as { snapContext?: SnapContext }).snapContext = this.snapContext;
    }
    return context;
  }

  /**
   * Render tool overlays.
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.activeTool?.render?.(ctx, this.getContext());
  }
}

/**
 * Create a tool manager.
 */
export function createToolManager(sceneGraph: SceneGraph, viewport: Viewport): ToolManager {
  return new ToolManager(sceneGraph, viewport);
}
