/**
 * Node Edit Tool
 *
 * Tool for editing anchor points and bezier handles on existing vector paths.
 *
 * Features:
 * - Select individual anchor points
 * - Select multiple anchors (Shift+click)
 * - Move anchor points
 * - Adjust bezier control handles
 * - Add anchor points on path segments
 * - Delete anchor points
 * - Toggle corner/smooth anchor type
 */

import type { Point, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import type { VectorNodeData } from '@scene/nodes/base-node';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';
import {
  type EditableAnchor,
  type HandleType,
  type HandleHitResult,
  type SegmentHitResult,
  parsePathToAnchors,
  buildPathFromAnchors,
  findClosestAnchor,
  findClosestHandle,
  findClosestSegment,
  splitSegmentAt,
  deleteAnchor,
  toggleAnchorType,
  moveAnchor,
  moveHandle,
} from './path-utils';

/**
 * Node edit tool state
 */
type NodeEditState =
  | 'idle'
  | 'selecting'
  | 'dragging_anchor'
  | 'dragging_handle'
  | 'marquee_select';

/**
 * Selection item - can be an anchor or a handle
 */
interface AnchorSelection {
  readonly type: 'anchor';
  readonly index: number;
}

interface HandleSelection {
  readonly type: 'handle';
  readonly anchorIndex: number;
  readonly handleType: HandleType;
}

type SelectionItem = AnchorSelection | HandleSelection;

/**
 * Node edit tool options
 */
export interface NodeEditToolOptions {
  /** Hit threshold for selecting points (in world units) */
  readonly hitThreshold?: number;
  /** Hit threshold for selecting segments (in world units) */
  readonly segmentHitThreshold?: number;
}

const DEFAULT_OPTIONS: Required<NodeEditToolOptions> = {
  hitThreshold: 8,
  segmentHitThreshold: 6,
};

/**
 * Node Edit Tool
 */
export class NodeEditTool extends BaseTool {
  readonly name = 'node-edit';
  cursor: ToolCursor = 'default';

  private options: Required<NodeEditToolOptions>;
  private state: NodeEditState = 'idle';

  // Currently editing node
  private editingNodeId: NodeId | null = null;
  private anchors: EditableAnchor[] = [];
  private isClosed = false;

  // Selection state
  private selectedItems: SelectionItem[] = [];
  private hoveredAnchor: EditableAnchor | null = null;
  private hoveredHandle: HandleHitResult | null = null;
  private hoveredSegment: SegmentHitResult | null = null;

  // Drag state
  private nodeDragStart: Point | null = null;
  private dragStartAnchors: EditableAnchor[] = [];

  // Callbacks
  private onPathChange?: (nodeId: NodeId, path: VectorPath) => void;

  constructor(options: NodeEditToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for path changes
   */
  setOnPathChange(callback: (nodeId: NodeId, path: VectorPath) => void): void {
    this.onPathChange = callback;
  }

  /**
   * Get the anchors for rendering
   */
  getAnchors(): readonly EditableAnchor[] {
    return this.anchors;
  }

  /**
   * Get selected anchor indices
   */
  getSelectedAnchorIndices(): number[] {
    return this.selectedItems
      .filter((item): item is AnchorSelection => item.type === 'anchor')
      .map(item => item.index);
  }

  /**
   * Check if editing a node
   */
  isEditing(): boolean {
    return this.editingNodeId !== null;
  }

  /**
   * Get the node being edited
   */
  getEditingNodeId(): NodeId | null {
    return this.editingNodeId;
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.reset();

    // If a vector node is selected, enter edit mode
    if (context.selectedNodeIds.length === 1) {
      const nodeId = context.selectedNodeIds[0]!;
      const node = context.sceneGraph.getNode(nodeId);
      if (node && node.type === 'VECTOR') {
        this.enterEditMode(nodeId, node as VectorNodeData, context);
      }
    }
  }

  override deactivate(): void {
    this.commitChanges();
    this.reset();
    super.deactivate();
  }

  private reset(): void {
    this.state = 'idle';
    this.editingNodeId = null;
    this.anchors = [];
    this.isClosed = false;
    this.selectedItems = [];
    this.hoveredAnchor = null;
    this.hoveredHandle = null;
    this.hoveredSegment = null;
    this.nodeDragStart = null;
    this.dragStartAnchors = [];
  }

  /**
   * Enter edit mode for a vector node
   */
  private enterEditMode(nodeId: NodeId, node: VectorNodeData, _context: ToolContext): void {
    if (node.vectorPaths.length === 0) return;

    // For now, edit only the first path
    const path = node.vectorPaths[0]!;
    this.editingNodeId = nodeId;

    const parsed = parsePathToAnchors(path);
    this.anchors = parsed.anchors;
    this.isClosed = parsed.isClosed;
    this.selectedItems = [];
  }

  /**
   * Exit edit mode and commit changes
   */
  private commitChanges(): void {
    if (this.editingNodeId && this.anchors.length > 0) {
      const newPath = buildPathFromAnchors(this.anchors, this.isClosed);
      this.onPathChange?.(this.editingNodeId, newPath);
    }
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();
    const threshold = this.options.hitThreshold / zoom;
    const segmentThreshold = this.options.segmentHitThreshold / zoom;

    // If not in edit mode, check if clicking on a vector node
    if (!this.editingNodeId) {
      // Check if clicked on a selected vector node
      for (const nodeId of context.selectedNodeIds) {
        const node = context.sceneGraph.getNode(nodeId);
        if (node && node.type === 'VECTOR') {
          this.enterEditMode(nodeId, node as VectorNodeData, context);
          return true;
        }
      }
      return false;
    }

    // Check for handle hit first (handles are on top)
    const handleHit = findClosestHandle(worldPoint, this.anchors, threshold);
    if (handleHit) {
      this.state = 'dragging_handle';
      this.nodeDragStart = worldPoint;
      this.dragStartAnchors = [...this.anchors];

      // Select this handle
      if (!event.shiftKey) {
        this.selectedItems = [];
      }
      this.selectedItems.push({
        type: 'handle',
        anchorIndex: handleHit.anchor.index,
        handleType: handleHit.handleType,
      });

      return true;
    }

    // Check for anchor hit
    const anchorHit = findClosestAnchor(worldPoint, this.anchors, threshold);
    if (anchorHit) {
      this.state = 'dragging_anchor';
      this.nodeDragStart = worldPoint;
      this.dragStartAnchors = [...this.anchors];

      // Handle selection
      const existingSelection = this.selectedItems.find(
        item => item.type === 'anchor' && item.index === anchorHit.index
      );

      if (event.shiftKey) {
        // Toggle selection
        if (existingSelection) {
          this.selectedItems = this.selectedItems.filter(item => item !== existingSelection);
        } else {
          this.selectedItems.push({ type: 'anchor', index: anchorHit.index });
        }
      } else {
        // Replace selection unless already selected
        if (!existingSelection) {
          this.selectedItems = [{ type: 'anchor', index: anchorHit.index }];
        }
      }

      return true;
    }

    // Check for segment hit (to add new anchor)
    if (event.altKey) {
      const segmentHit = findClosestSegment(
        worldPoint,
        this.anchors,
        segmentThreshold,
        this.isClosed
      );

      if (segmentHit) {
        // Add new anchor at this point
        this.anchors = splitSegmentAt(this.anchors, segmentHit.segmentIndex, segmentHit.t);
        this.commitChanges();

        // Select the new anchor
        this.selectedItems = [{ type: 'anchor', index: segmentHit.segmentIndex + 1 }];
        return true;
      }
    }

    // Clicked on empty space - clear selection
    if (!event.shiftKey) {
      this.selectedItems = [];
    }

    return true;
  }

  onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();
    const threshold = this.options.hitThreshold / zoom;
    const segmentThreshold = this.options.segmentHitThreshold / zoom;

    if (this.state === 'dragging_anchor' && this.nodeDragStart) {
      const dx = worldPoint.x - this.nodeDragStart.x;
      const dy = worldPoint.y - this.nodeDragStart.y;

      // Move all selected anchors
      let newAnchors = [...this.dragStartAnchors];
      for (const item of this.selectedItems) {
        if (item.type === 'anchor') {
          const origAnchor = this.dragStartAnchors[item.index];
          if (origAnchor) {
            const newPos = {
              x: origAnchor.position.x + dx,
              y: origAnchor.position.y + dy,
            };
            newAnchors = moveAnchor(newAnchors, item.index, newPos);
          }
        }
      }
      this.anchors = newAnchors;
    } else if (this.state === 'dragging_handle' && this.nodeDragStart) {
      // Find the handle selection
      const handleSelection = this.selectedItems.find(
        (item): item is HandleSelection => item.type === 'handle'
      );

      if (handleSelection) {
        // Move the handle
        const symmetric = !event.altKey; // Alt breaks symmetry
        this.anchors = moveHandle(
          this.dragStartAnchors,
          handleSelection.anchorIndex,
          handleSelection.handleType,
          worldPoint,
          symmetric
        );
      }
    } else {
      // Update hover state
      this.hoveredHandle = findClosestHandle(worldPoint, this.anchors, threshold);
      if (!this.hoveredHandle) {
        this.hoveredAnchor = findClosestAnchor(worldPoint, this.anchors, threshold);
      } else {
        this.hoveredAnchor = null;
      }

      // Check for segment hover (for adding anchors)
      if (event.altKey && !this.hoveredAnchor && !this.hoveredHandle) {
        this.hoveredSegment = findClosestSegment(
          worldPoint,
          this.anchors,
          segmentThreshold,
          this.isClosed
        );
      } else {
        this.hoveredSegment = null;
      }
    }
  }

  onPointerUp(event: PointerEventData, context: ToolContext): void {
    super.onPointerUp(event, context);

    if (this.state === 'dragging_anchor' || this.state === 'dragging_handle') {
      this.commitChanges();
    }

    this.state = 'idle';
    this.nodeDragStart = null;
    this.dragStartAnchors = [];
  }

  onDoubleClick(event: PointerEventData, context: ToolContext): void {
    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();
    const threshold = this.options.hitThreshold / zoom;

    // Double-click on anchor toggles corner/smooth
    const anchorHit = findClosestAnchor(worldPoint, this.anchors, threshold);
    if (anchorHit) {
      this.anchors = toggleAnchorType(this.anchors, anchorHit.index);
      this.commitChanges();
    }
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    // Delete selected anchors
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedAnchorIndices = this.getSelectedAnchorIndices();
      if (selectedAnchorIndices.length > 0 && this.anchors.length > 2) {
        // Delete from highest index first to avoid index shifting
        const sorted = [...selectedAnchorIndices].sort((a, b) => b - a);
        let newAnchors = this.anchors;
        for (const index of sorted) {
          if (newAnchors.length > 2) {
            newAnchors = deleteAnchor(newAnchors, index);
          }
        }
        this.anchors = newAnchors;
        this.selectedItems = [];
        this.commitChanges();
        return true;
      }
    }

    // Escape exits edit mode
    if (event.key === 'Escape') {
      this.commitChanges();
      this.reset();

      // Switch back to select tool
      // This would be handled by the tool manager
      return true;
    }

    // Select all anchors
    if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      this.selectedItems = this.anchors.map((_, i) => ({
        type: 'anchor' as const,
        index: i,
      }));
      return true;
    }

    return false;
  }

  getCursor(point: Point, context: ToolContext): ToolCursor {
    if (!this.editingNodeId) {
      return 'default';
    }

    const zoom = context.viewport.getZoom();
    const threshold = this.options.hitThreshold / zoom;

    // Check for handle hover
    const handleHit = findClosestHandle(point, this.anchors, threshold);
    if (handleHit) {
      return 'pointer';
    }

    // Check for anchor hover
    const anchorHit = findClosestAnchor(point, this.anchors, threshold);
    if (anchorHit) {
      return 'move';
    }

    return 'crosshair';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.editingNodeId || this.anchors.length === 0) {
      return;
    }

    const zoom = context.viewport.getZoom();
    const anchorSize = 6 / zoom;
    const handleSize = 5 / zoom;
    const lineWidth = 1 / zoom;

    ctx.save();

    // Get selected anchor indices for highlighting
    const selectedIndices = new Set(this.getSelectedAnchorIndices());

    // Draw path outline
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    this.drawPathOutline(ctx);

    // Draw handles and handle lines for all anchors
    for (const anchor of this.anchors) {
      const isSelected = selectedIndices.has(anchor.index);

      // Draw handle lines
      if (anchor.handleIn) {
        ctx.strokeStyle = isSelected ? '#0066ff' : '#888888';
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(anchor.position.x, anchor.position.y);
        ctx.lineTo(anchor.handleIn.x, anchor.handleIn.y);
        ctx.stroke();
      }

      if (anchor.handleOut) {
        ctx.strokeStyle = isSelected ? '#0066ff' : '#888888';
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(anchor.position.x, anchor.position.y);
        ctx.lineTo(anchor.handleOut.x, anchor.handleOut.y);
        ctx.stroke();
      }

      // Draw handle points
      if (anchor.handleIn) {
        this.drawHandle(ctx, anchor.handleIn, handleSize, isSelected);
      }
      if (anchor.handleOut) {
        this.drawHandle(ctx, anchor.handleOut, handleSize, isSelected);
      }
    }

    // Draw anchor points on top
    for (const anchor of this.anchors) {
      const isSelected = selectedIndices.has(anchor.index);
      const isHovered = this.hoveredAnchor?.index === anchor.index;
      this.drawAnchor(ctx, anchor, anchorSize, isSelected, isHovered);
    }

    // Draw segment hover indicator
    if (this.hoveredSegment) {
      ctx.fillStyle = '#00aa44';
      ctx.beginPath();
      ctx.arc(
        this.hoveredSegment.point.x,
        this.hoveredSegment.point.y,
        handleSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPathOutline(ctx: CanvasRenderingContext2D): void {
    if (this.anchors.length === 0) return;

    ctx.beginPath();
    const first = this.anchors[0]!;
    ctx.moveTo(first.position.x, first.position.y);

    for (let i = 1; i < this.anchors.length; i++) {
      const prev = this.anchors[i - 1]!;
      const curr = this.anchors[i]!;

      if (prev.handleOut || curr.handleIn) {
        const cp1 = prev.handleOut ?? prev.position;
        const cp2 = curr.handleIn ?? curr.position;
        ctx.bezierCurveTo(
          cp1.x, cp1.y,
          cp2.x, cp2.y,
          curr.position.x, curr.position.y
        );
      } else {
        ctx.lineTo(curr.position.x, curr.position.y);
      }
    }

    if (this.isClosed && this.anchors.length > 1) {
      const last = this.anchors[this.anchors.length - 1]!;
      if (last.handleOut || first.handleIn) {
        const cp1 = last.handleOut ?? last.position;
        const cp2 = first.handleIn ?? first.position;
        ctx.bezierCurveTo(
          cp1.x, cp1.y,
          cp2.x, cp2.y,
          first.position.x, first.position.y
        );
      } else {
        ctx.lineTo(first.position.x, first.position.y);
      }
      ctx.closePath();
    }

    ctx.stroke();
  }

  private drawAnchor(
    ctx: CanvasRenderingContext2D,
    anchor: EditableAnchor,
    size: number,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { x, y } = anchor.position;

    // Fill color based on state
    if (isSelected) {
      ctx.fillStyle = '#0066ff';
    } else if (isHovered) {
      ctx.fillStyle = '#4dabff';
    } else {
      ctx.fillStyle = '#ffffff';
    }

    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 1.5 / (size * 0.5);

    if (anchor.isCorner) {
      // Draw square for corner points
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    } else {
      // Draw circle for smooth points
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawHandle(
    ctx: CanvasRenderingContext2D,
    position: Point,
    size: number,
    isParentSelected: boolean
  ): void {
    ctx.fillStyle = isParentSelected ? '#ffffff' : '#cccccc';
    ctx.strokeStyle = isParentSelected ? '#0066ff' : '#888888';
    ctx.lineWidth = 1 / (size * 0.5);

    ctx.beginPath();
    ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Create a node edit tool instance
 */
export function createNodeEditTool(options?: NodeEditToolOptions): NodeEditTool {
  return new NodeEditTool(options);
}
