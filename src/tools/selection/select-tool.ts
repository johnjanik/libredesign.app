/**
 * Select Tool - Selection and basic manipulation
 */

import type { NodeId } from '@core/types/common';
import type { Point, Rect } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Selection mode
 */
type SelectionMode = 'replace' | 'add' | 'subtract' | 'toggle';

/**
 * Resize handle positions
 */
type HandlePosition = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

/**
 * Snap guide for rendering
 */
interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

/**
 * Rotation corner position
 */
type RotationCorner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Select tool state
 */
interface SelectToolState {
  mode: 'idle' | 'clicking' | 'marquee' | 'resizing' | 'moving' | 'rotating';
  marqueeStart: Point | null;
  marqueeEnd: Point | null;
  clickTarget: NodeId | null;
  // Resize state
  activeHandle: HandlePosition | null;
  resizeTarget: NodeId | null;
  resizeStartBounds: Rect | null;
  resizeStartPoint: Point | null;
  // Move state
  moveStartPoint: Point | null;
  moveStartPositions: Map<NodeId, { x: number; y: number }> | null;
  // Duplicate while moving (Alt+drag - canonical behavior)
  duplicatedNodes: boolean;
  originalSelection: NodeId[] | null;
  // Snapping state
  activeSnap: { x: number; y: number; type: string } | null;
  activeGuides: SnapGuide[];
  // Rotation state
  rotationCorner: RotationCorner | null;
  rotationPivot: Point | null;
  rotationStartAngle: number;
  rotationCurrentAngle: number;
  rotationStartRotations: Map<NodeId, number> | null;
  rotationStartPositions: Map<NodeId, Point> | null;
  rotationCursorPoint: Point | null;
}

/**
 * Select Tool
 */
export class SelectTool extends BaseTool {
  readonly name = 'select';
  cursor: ToolCursor = 'default';

  private state: SelectToolState = {
    mode: 'idle',
    marqueeStart: null,
    marqueeEnd: null,
    clickTarget: null,
    activeHandle: null,
    resizeTarget: null,
    resizeStartBounds: null,
    resizeStartPoint: null,
    moveStartPoint: null,
    moveStartPositions: null,
    duplicatedNodes: false,
    originalSelection: null,
    activeSnap: null,
    activeGuides: [],
    rotationCorner: null,
    rotationPivot: null,
    rotationStartAngle: 0,
    rotationCurrentAngle: 0,
    rotationStartRotations: null,
    rotationStartPositions: null,
    rotationCursorPoint: null,
  };

  private readonly handleSize = 8;
  private readonly rotationZoneInner = 12; // Inner radius (outside resize handles)
  private readonly rotationZoneOuter = 28; // Outer radius for rotation zone

  // Callbacks for external actions
  private onSelectionChange: ((nodeIds: NodeId[]) => void) | undefined;

  constructor(options?: { onSelectionChange?: ((nodeIds: NodeId[]) => void) | undefined }) {
    super();
    this.onSelectionChange = options?.onSelectionChange;
  }

  activate(context: ToolContext): void {
    super.activate(context);
    this.resetState();
  }

  deactivate(): void {
    super.deactivate();
    this.resetState();
  }

  private resetState(): void {
    this.state = {
      mode: 'idle',
      marqueeStart: null,
      marqueeEnd: null,
      clickTarget: null,
      activeHandle: null,
      resizeTarget: null,
      resizeStartBounds: null,
      resizeStartPoint: null,
      moveStartPoint: null,
      moveStartPositions: null,
      duplicatedNodes: false,
      originalSelection: null,
      activeSnap: null,
      activeGuides: [],
      rotationCorner: null,
      rotationPivot: null,
      rotationStartAngle: 0,
      rotationCurrentAngle: 0,
      rotationStartRotations: null,
      rotationStartPositions: null,
      rotationCursorPoint: null,
    };
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();

    // Check for rotation zone FIRST (outside corners of combined selection bounds)
    const selectionBounds = this.getSelectionBounds(context);
    if (selectionBounds && context.selectedNodeIds.length > 0) {
      const rotationCorner = this.hitTestRotationZone(worldPoint, selectionBounds, zoom);
      if (rotationCorner) {
        // Start rotation
        const pivot: Point = {
          x: selectionBounds.x + selectionBounds.width / 2,
          y: selectionBounds.y + selectionBounds.height / 2,
        };

        this.state.mode = 'rotating';
        this.state.rotationCorner = rotationCorner;
        this.state.rotationPivot = pivot;
        this.state.rotationStartAngle = this.calculateAngle(pivot, worldPoint);
        this.state.rotationCurrentAngle = 0;
        this.state.rotationCursorPoint = worldPoint;

        // Store initial rotations and positions for all selected nodes
        this.state.rotationStartRotations = new Map();
        this.state.rotationStartPositions = new Map();
        for (const nodeId of context.selectedNodeIds) {
          const node = context.sceneGraph.getNode(nodeId);
          if (node) {
            const rotation = ('rotation' in node) ? (node as { rotation: number }).rotation : 0;
            this.state.rotationStartRotations.set(nodeId, rotation);
            if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
              const n = node as { x: number; y: number; width: number; height: number };
              // Store center position
              this.state.rotationStartPositions.set(nodeId, {
                x: n.x + n.width / 2,
                y: n.y + n.height / 2,
              });
            }
          }
        }
        return true;
      }
    }

    // Check if clicking on a resize handle of a selected node
    for (const nodeId of context.selectedNodeIds) {
      // Use world bounds to account for parent transforms
      const worldBounds = context.sceneGraph.getWorldBounds(nodeId);
      if (worldBounds) {
        const handle = this.hitTestHandles(worldPoint, worldBounds, zoom);

        if (handle) {
          // Start resizing - need local bounds for resize operations
          const node = context.sceneGraph.getNode(nodeId);
          if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
            const n = node as { x: number; y: number; width: number; height: number };
            this.state.mode = 'resizing';
            this.state.activeHandle = handle;
            this.state.resizeTarget = nodeId;
            this.state.resizeStartBounds = { x: n.x, y: n.y, width: n.width, height: n.height };
            this.state.resizeStartPoint = worldPoint;
            return true;
          }
        }
      }
    }

    // Hit test to find node under cursor
    const hitNodeId = this.hitTest(worldPoint, context.sceneGraph);

    if (hitNodeId) {
      // Check if clicking on an already selected node (start moving)
      if (context.selectedNodeIds.includes(hitNodeId)) {
        this.state.mode = 'moving';
        this.state.moveStartPoint = worldPoint;
        this.state.moveStartPositions = new Map();

        for (const id of context.selectedNodeIds) {
          const node = context.sceneGraph.getNode(id);
          if (node && 'x' in node && 'y' in node) {
            const n = node as { x: number; y: number };
            this.state.moveStartPositions.set(id, { x: n.x, y: n.y });
          }
        }
      } else {
        // Clicked on an unselected node
        this.state.mode = 'clicking';
        this.state.clickTarget = hitNodeId;

        // Handle selection based on modifier keys
        const selectionMode = this.getSelectionMode(event);
        this.handleNodeSelection(hitNodeId, selectionMode, context);
      }
    } else {
      // Clicked on empty space - start marquee selection
      this.state.mode = 'marquee';
      this.state.marqueeStart = worldPoint;
      this.state.marqueeEnd = worldPoint;

      // Clear selection unless shift is held
      if (!event.shiftKey) {
        this.updateSelection([], context);
      }
    }

    return true;
  }

  onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };

    // Clear snapping state
    this.state.activeSnap = null;
    this.state.activeGuides = [];

    // Handle rotation
    if (this.state.mode === 'rotating' && this.state.rotationPivot && this.state.rotationStartRotations && this.state.rotationStartPositions) {
      this.state.rotationCursorPoint = worldPoint;

      // Calculate current angle and delta
      const currentAngle = this.calculateAngle(this.state.rotationPivot, worldPoint);
      let deltaAngle = currentAngle - this.state.rotationStartAngle;

      // Snap to 45° increments when Shift is held
      if (event.shiftKey) {
        const totalAngle = this.state.rotationStartAngle + deltaAngle;
        const snappedTotal = this.snapAngle(totalAngle, 45);
        deltaAngle = snappedTotal - this.state.rotationStartAngle;
      }

      this.state.rotationCurrentAngle = deltaAngle;

      // Apply rotation to all selected nodes
      for (const nodeId of context.selectedNodeIds) {
        const startRotation = this.state.rotationStartRotations.get(nodeId) ?? 0;
        const startCenter = this.state.rotationStartPositions.get(nodeId);
        const node = context.sceneGraph.getNode(nodeId);

        if (node && startCenter && 'width' in node && 'height' in node) {
          const n = node as { width: number; height: number };

          // Rotate the node's center around the pivot
          const newCenter = this.rotatePoint(startCenter, this.state.rotationPivot, deltaAngle);

          // Update node position (center-based)
          context.sceneGraph.updateNode(nodeId, {
            x: newCenter.x - n.width / 2,
            y: newCenter.y - n.height / 2,
            rotation: startRotation + deltaAngle,
          });
        }
      }
      return;
    }

    if (this.state.mode === 'resizing' && this.state.resizeTarget && this.state.resizeStartBounds && this.state.resizeStartPoint && this.state.activeHandle) {
      // Calculate new bounds based on handle being dragged
      let newBounds = this.calculateResizedBounds(
        this.state.resizeStartBounds,
        this.state.activeHandle,
        this.state.resizeStartPoint,
        worldPoint,
        event.shiftKey // Preserve aspect ratio with shift
      );

      // Apply snapping to resize if available (snap the corner/edge being dragged)
      if (context.snapContext?.isEnabled()) {
        const snapPoint = this.getResizeSnapPoint(newBounds, this.state.activeHandle);
        const snap = context.snapContext.findSnapPoint(snapPoint.x, snapPoint.y, [this.state.resizeTarget]);

        if (snap) {
          // Adjust bounds based on snap
          newBounds = this.applySnapToBounds(newBounds, this.state.activeHandle, snapPoint, { x: snap.x, y: snap.y });
          this.state.activeSnap = snap;

          // Get alignment guides
          const guides = context.snapContext.findAlignmentGuides(snap.x, snap.y, [this.state.resizeTarget]);
          this.state.activeGuides = guides;
        }
      }

      // Update the node
      context.sceneGraph.updateNode(this.state.resizeTarget, {
        x: newBounds.x,
        y: newBounds.y,
        width: newBounds.width,
        height: newBounds.height,
      });
    } else if (this.state.mode === 'moving' && this.state.moveStartPoint && this.state.moveStartPositions) {
      // Alt+drag: duplicate nodes on first move (canonical behavior)
      if (event.altKey && !this.state.duplicatedNodes) {
        this.duplicateNodesForMove(context);
        this.state.duplicatedNodes = true;
      }

      // Calculate delta from start point
      let dx = worldPoint.x - this.state.moveStartPoint.x;
      let dy = worldPoint.y - this.state.moveStartPoint.y;

      // Shift+drag: constrain to horizontal or vertical
      if (event.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) {
          dy = 0; // Constrain to horizontal
        } else {
          dx = 0; // Constrain to vertical
        }
      }

      // Apply snapping to move if available
      if (context.snapContext?.isEnabled() && this.state.moveStartPositions.size > 0) {
        // Get the first node's proposed new position for snapping reference
        const firstEntry = this.state.moveStartPositions.entries().next().value;
        if (firstEntry) {
          const [firstNodeId, firstStartPos] = firstEntry;
          const proposedX = firstStartPos.x + dx;
          const proposedY = firstStartPos.y + dy;

          // Get node bounds for snapping (snap to center and corners)
          const node = context.sceneGraph.getNode(firstNodeId);
          if (node && 'width' in node && 'height' in node) {
            const n = node as { width: number; height: number };
            const centerX = proposedX + n.width / 2;
            const centerY = proposedY + n.height / 2;

            // Try snapping the center point
            const excludeIds = Array.from(this.state.moveStartPositions.keys());
            const snap = context.snapContext.findSnapPoint(centerX, centerY, excludeIds);

            if (snap) {
              // Adjust delta to snap to the point
              dx += snap.x - centerX;
              dy += snap.y - centerY;
              this.state.activeSnap = snap;

              // Get alignment guides
              const guides = context.snapContext.findAlignmentGuides(snap.x, snap.y, excludeIds);
              this.state.activeGuides = guides;
            }
          }
        }
      }

      // Move all selected nodes
      for (const [nodeId, startPos] of this.state.moveStartPositions) {
        context.sceneGraph.updateNode(nodeId, {
          x: startPos.x + dx,
          y: startPos.y + dy,
        });
      }
    } else if (this.state.mode === 'marquee' && this.state.marqueeStart) {
      this.state.marqueeEnd = worldPoint;

      // Update selection based on marquee
      // Window selection (left-to-right): only fully contained objects
      // Crossing selection (right-to-left): any intersecting objects
      const marqueeRect = this.getMarqueeRect();
      if (marqueeRect) {
        const windowSelection = this.isWindowSelection();
        const nodesInMarquee = this.findNodesInRect(marqueeRect, context.sceneGraph, windowSelection);
        this.updateSelection(nodesInMarquee, context);
      }
    }
  }

  /**
   * Get the point to snap for a resize operation based on which handle is being dragged.
   */
  private getResizeSnapPoint(bounds: Rect, handle: HandlePosition): Point {
    switch (handle) {
      case 'nw': return { x: bounds.x, y: bounds.y };
      case 'n': return { x: bounds.x + bounds.width / 2, y: bounds.y };
      case 'ne': return { x: bounds.x + bounds.width, y: bounds.y };
      case 'w': return { x: bounds.x, y: bounds.y + bounds.height / 2 };
      case 'e': return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
      case 'sw': return { x: bounds.x, y: bounds.y + bounds.height };
      case 's': return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
      case 'se': return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
      default: return { x: bounds.x, y: bounds.y };
    }
  }

  /**
   * Apply a snap adjustment to bounds based on handle position.
   */
  private applySnapToBounds(bounds: Rect, handle: HandlePosition, originalPoint: Point, snapPoint: Point): Rect {
    const dx = snapPoint.x - originalPoint.x;
    const dy = snapPoint.y - originalPoint.y;
    const result = { ...bounds };

    // Adjust position and/or size based on handle
    switch (handle) {
      case 'nw':
        result.x += dx;
        result.y += dy;
        result.width -= dx;
        result.height -= dy;
        break;
      case 'n':
        result.y += dy;
        result.height -= dy;
        break;
      case 'ne':
        result.y += dy;
        result.width += dx;
        result.height -= dy;
        break;
      case 'w':
        result.x += dx;
        result.width -= dx;
        break;
      case 'e':
        result.width += dx;
        break;
      case 'sw':
        result.x += dx;
        result.width -= dx;
        result.height += dy;
        break;
      case 's':
        result.height += dy;
        break;
      case 'se':
        result.width += dx;
        result.height += dy;
        break;
    }

    return result;
  }

  onPointerUp(event: PointerEventData, context: ToolContext): void {
    super.onPointerUp(event, context);

    if (this.state.mode === 'rotating') {
      // Rotation complete - could add undo entry here if history manager is available
      // context.historyManager?.commit('Rotate');
    }

    if (this.state.mode === 'marquee') {
      // Finalize marquee selection
      // Window selection (left-to-right): only fully contained objects
      // Crossing selection (right-to-left): any intersecting objects
      const marqueeRect = this.getMarqueeRect();
      if (marqueeRect) {
        const windowSelection = this.isWindowSelection();
        const nodesInMarquee = this.findNodesInRect(marqueeRect, context.sceneGraph, windowSelection);

        if (event.shiftKey) {
          // Add to existing selection
          const combined = new Set([...context.selectedNodeIds, ...nodesInMarquee]);
          this.updateSelection(Array.from(combined), context);
        } else {
          this.updateSelection(nodesInMarquee, context);
        }
      }
    }

    this.resetState();
  }

  onKeyDown(event: KeyEventData, context: ToolContext): boolean {
    // Handle selection shortcuts
    if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      // Select all
      this.selectAll(context);
      return true;
    }

    if (event.key === 'Escape') {
      // Clear selection
      this.updateSelection([], context);
      return true;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Delete selected nodes (handled externally)
      return true;
    }

    return false;
  }

  getCursor(point: Point, context: ToolContext): ToolCursor {
    const zoom = context.viewport.getZoom();

    // Get combined selection bounds for rotation zone detection
    const selectionBounds = this.getSelectionBounds(context);

    if (selectionBounds && context.selectedNodeIds.length > 0) {
      // Check rotation zone FIRST (outside corners)
      const rotationCorner = this.hitTestRotationZone(point, selectionBounds, zoom);
      if (rotationCorner) {
        return 'grab'; // Use grab cursor for rotation (or could use custom 'rotate')
      }

      // Check resize handles
      const handle = this.hitTestHandles(point, selectionBounds, zoom);
      if (handle) {
        return this.getHandleCursor(handle);
      }
    }

    // Check if hovering over a selected node (move cursor)
    const hitNodeId = this.hitTest(point, context.sceneGraph);
    if (hitNodeId && context.selectedNodeIds.includes(hitNodeId)) {
      return 'move';
    }

    return hitNodeId ? 'pointer' : 'default';
  }

  /**
   * Get combined bounds of all selected nodes
   */
  private getSelectionBounds(context: ToolContext): Rect | null {
    if (context.selectedNodeIds.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const nodeId of context.selectedNodeIds) {
      const bounds = context.sceneGraph.getWorldBounds(nodeId);
      if (bounds) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
    }

    if (!isFinite(minX)) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    // Render marquee selection box
    if (this.state.mode === 'marquee' && this.state.marqueeStart && this.state.marqueeEnd) {
      const rect = this.getMarqueeRect();
      if (rect) {
        ctx.save();

        const windowSelection = this.isWindowSelection();

        if (windowSelection) {
          // Window selection (left-to-right): solid blue border
          // Only objects fully contained within the box will be selected
          ctx.strokeStyle = '#0066ff';
          ctx.lineWidth = 1;
          ctx.setLineDash([]); // Solid line
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

          // Fill with semi-transparent blue
          ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        } else {
          // Crossing selection (right-to-left): dashed green border
          // Any object that intersects the box will be selected
          ctx.strokeStyle = '#00aa44';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]); // Dashed line
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

          // Fill with semi-transparent green
          ctx.fillStyle = 'rgba(0, 170, 68, 0.1)';
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        ctx.restore();
      }
    }

    // Render selection handles for selected nodes
    this.renderSelectionHandles(ctx, context);

    // Render snap guides and indicator during move/resize
    if ((this.state.mode === 'moving' || this.state.mode === 'resizing') &&
        (this.state.activeSnap || this.state.activeGuides.length > 0)) {
      this.renderSnapFeedback(ctx, context);
    }

    // Render rotation guides and readout during rotation
    if (this.state.mode === 'rotating' && this.state.rotationPivot && this.state.rotationCursorPoint) {
      this.renderRotationFeedback(ctx, context);
    }
  }

  /**
   * Render rotation feedback (angle guides, rotation arc, and angle readout)
   */
  private renderRotationFeedback(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.state.rotationPivot || !this.state.rotationCursorPoint) return;

    const zoom = context.viewport.getZoom();
    const pivot = this.state.rotationPivot;
    const cursor = this.state.rotationCursorPoint;
    const deltaAngle = this.state.rotationCurrentAngle;

    ctx.save();

    // Draw snap angle guide lines (45° increments)
    const guideLength = 60 / zoom;
    const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];

    ctx.strokeStyle = 'rgba(0, 102, 255, 0.25)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);

    for (const angle of snapAngles) {
      const rad = -angle * Math.PI / 180; // Negate for screen coordinates
      ctx.beginPath();
      ctx.moveTo(pivot.x, pivot.y);
      ctx.lineTo(
        pivot.x + Math.cos(rad) * guideLength,
        pivot.y + Math.sin(rad) * guideLength
      );
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Highlight snapped angle if close to a snap point
    const normalizedDelta = this.normalizeAngle(deltaAngle);
    for (const snapAngle of snapAngles) {
      if (Math.abs(normalizedDelta - snapAngle) < 3 || Math.abs(normalizedDelta - snapAngle - 360) < 3) {
        const rad = -snapAngle * Math.PI / 180;
        ctx.strokeStyle = '#00FF00'; // Green for active snap
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(pivot.x, pivot.y);
        ctx.lineTo(
          pivot.x + Math.cos(rad) * guideLength * 1.2,
          pivot.y + Math.sin(rad) * guideLength * 1.2
        );
        ctx.stroke();
        break;
      }
    }

    // Draw rotation arc from 0 to current angle
    const arcRadius = 25 / zoom;
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    // Arc from 0 (right/east) to current delta angle
    const startRad = 0;
    const endRad = -deltaAngle * Math.PI / 180;
    ctx.arc(pivot.x, pivot.y, arcRadius, startRad, endRad, deltaAngle > 0);
    ctx.stroke();

    // Draw line from pivot to cursor
    ctx.strokeStyle = 'rgba(0, 102, 255, 0.6)';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 2 / zoom]);
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(cursor.x, cursor.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw pivot point indicator
    ctx.fillStyle = '#0066FF';
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 4 / zoom, 0, Math.PI * 2);
    ctx.fill();

    // Draw angle readout label with background
    const labelX = cursor.x + 15 / zoom;
    const labelY = cursor.y - 15 / zoom;
    const angleText = `${deltaAngle.toFixed(1)}°`;

    const fontSize = 12 / zoom;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(angleText);

    // Background
    const padding = 4 / zoom;
    ctx.fillStyle = '#0066FF';
    ctx.fillRect(
      labelX - padding,
      labelY - fontSize - padding / 2,
      metrics.width + padding * 2,
      fontSize + padding
    );

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(angleText, labelX, labelY - fontSize);

    ctx.restore();
  }

  /**
   * Render snap feedback (alignment guides and snap indicator).
   */
  private renderSnapFeedback(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    // Render alignment guides
    if (this.state.activeGuides.length > 0) {
      ctx.strokeStyle = '#FF00FF'; // Magenta for visibility
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([6 / zoom, 3 / zoom]);

      for (const guide of this.state.activeGuides) {
        ctx.beginPath();

        if (guide.type === 'horizontal') {
          ctx.moveTo(guide.start, guide.position);
          ctx.lineTo(guide.end, guide.position);
        } else {
          ctx.moveTo(guide.position, guide.start);
          ctx.lineTo(guide.position, guide.end);
        }

        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Render snap indicator
    if (this.state.activeSnap) {
      const snap = this.state.activeSnap;
      const size = 12 / zoom;

      ctx.strokeStyle = '#FF00FF';
      ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
      ctx.lineWidth = 2 / zoom;

      // Draw crosshair at snap point
      ctx.beginPath();
      ctx.moveTo(snap.x - size, snap.y);
      ctx.lineTo(snap.x + size, snap.y);
      ctx.moveTo(snap.x, snap.y - size);
      ctx.lineTo(snap.x, snap.y + size);
      ctx.stroke();

      // Draw circle at snap point
      ctx.beginPath();
      ctx.arc(snap.x, snap.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw label
      const fontSize = 10 / zoom;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#FF00FF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const label = snap.type.charAt(0).toUpperCase() + snap.type.slice(1);
      ctx.fillText(label, snap.x + size, snap.y - size / 2);
    }

    ctx.restore();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private getSelectionMode(event: PointerEventData): SelectionMode {
    if (event.shiftKey && event.ctrlKey) return 'subtract';
    if (event.shiftKey) return 'add';
    if (event.ctrlKey || event.metaKey) return 'toggle';
    return 'replace';
  }

  private handleNodeSelection(
    nodeId: NodeId,
    mode: SelectionMode,
    context: ToolContext
  ): void {
    const currentSelection = [...context.selectedNodeIds];
    const isSelected = currentSelection.includes(nodeId);

    let newSelection: NodeId[];

    switch (mode) {
      case 'replace':
        newSelection = [nodeId];
        break;
      case 'add':
        newSelection = isSelected ? currentSelection : [...currentSelection, nodeId];
        break;
      case 'subtract':
        newSelection = currentSelection.filter(id => id !== nodeId);
        break;
      case 'toggle':
        newSelection = isSelected
          ? currentSelection.filter(id => id !== nodeId)
          : [...currentSelection, nodeId];
        break;
    }

    this.updateSelection(newSelection, context);
  }

  private updateSelection(nodeIds: NodeId[], _context: ToolContext): void {
    this.onSelectionChange?.(nodeIds);
  }

  /**
   * Duplicate selected nodes for Ctrl+drag operation.
   * Creates copies of selected nodes and switches to moving the copies.
   */
  private duplicateNodesForMove(context: ToolContext): void {
    if (!this.state.moveStartPositions) return;

    const newNodeIds: NodeId[] = [];
    const newMovePositions = new Map<NodeId, { x: number; y: number }>();

    for (const nodeId of this.state.moveStartPositions.keys()) {
      const node = context.sceneGraph.getNode(nodeId);
      if (!node) continue;

      // Get parent for creating duplicate
      const parent = context.sceneGraph.getParent(nodeId);
      if (!parent) continue;

      // Clone node properties
      const props: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        if (key === 'id' || key === 'parentId' || key === 'childIds') continue;
        const value = (node as unknown as Record<string, unknown>)[key];
        if (value !== null && typeof value === 'object') {
          props[key] = JSON.parse(JSON.stringify(value));
        } else {
          props[key] = value;
        }
      }

      // Create duplicate
      const newNodeId = context.sceneGraph.createNode(
        node.type as 'FRAME' | 'GROUP' | 'VECTOR' | 'TEXT' | 'IMAGE' | 'COMPONENT' | 'INSTANCE',
        parent.id,
        -1,
        props as Parameters<typeof context.sceneGraph.createNode>[3]
      );

      // Store new node position
      if ('x' in node && 'y' in node) {
        const n = node as { x: number; y: number };
        newMovePositions.set(newNodeId, { x: n.x, y: n.y });
      }
      newNodeIds.push(newNodeId);
    }

    // Switch to moving the duplicated nodes
    if (newNodeIds.length > 0) {
      this.state.moveStartPositions = newMovePositions;
      this.updateSelection(newNodeIds, context);
    }
  }

  private hitTest(point: Point, sceneGraph: SceneGraph): NodeId | null {
    // Get all nodes and test in reverse order (top to bottom)
    const doc = sceneGraph.getDocument();
    if (!doc) return null;

    const pageIds = sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return null;

    const pageId = pageIds[0]!;
    return this.hitTestNode(pageId, point, sceneGraph);
  }

  private hitTestNode(nodeId: NodeId, point: Point, sceneGraph: SceneGraph): NodeId | null {
    const node = sceneGraph.getNode(nodeId);
    if (!node) return null;

    // Skip non-selectable nodes
    if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
      // Test children
      const childIds = sceneGraph.getChildIds(nodeId);
      // Test in reverse order (top-most first)
      for (let i = childIds.length - 1; i >= 0; i--) {
        const hit = this.hitTestNode(childIds[i]!, point, sceneGraph);
        if (hit) return hit;
      }
      return null;
    }

    // Check if node has bounds
    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      const n = node as { x: number; y: number; width: number; height: number };
      const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };

      if (this.pointInRect(point, bounds)) {
        // Check children first (they're on top)
        const childIds = sceneGraph.getChildIds(nodeId);
        for (let i = childIds.length - 1; i >= 0; i--) {
          const hit = this.hitTestNode(childIds[i]!, point, sceneGraph);
          if (hit) return hit;
        }
        return nodeId;
      }
    }

    return null;
  }

  /**
   * Find nodes within a selection rect.
   * @param rect The marquee selection rectangle
   * @param sceneGraph The scene graph to search
   * @param windowSelection If true (left-to-right drag), only select fully contained objects.
   *                        If false (right-to-left drag), select any intersecting objects.
   */
  private findNodesInRect(rect: Rect, sceneGraph: SceneGraph, windowSelection: boolean): NodeId[] {
    const result: NodeId[] = [];

    const doc = sceneGraph.getDocument();
    if (!doc) return result;

    const pageIds = sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return result;

    const pageId = pageIds[0]!;
    this.findNodesInRectRecursive(pageId, rect, sceneGraph, result, windowSelection);

    return result;
  }

  private findNodesInRectRecursive(
    nodeId: NodeId,
    rect: Rect,
    sceneGraph: SceneGraph,
    result: NodeId[],
    windowSelection: boolean
  ): void {
    const node = sceneGraph.getNode(nodeId);
    if (!node) return;

    // Skip non-selectable nodes
    if (node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };

        // Window selection (left-to-right): only fully contained objects
        // Crossing selection (right-to-left): any intersecting objects
        const isSelected = windowSelection
          ? this.rectContains(rect, bounds)
          : this.rectsIntersect(rect, bounds);

        if (isSelected) {
          result.push(nodeId);
        }
      }
    }

    // Check children
    const childIds = sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.findNodesInRectRecursive(childId, rect, sceneGraph, result, windowSelection);
    }
  }

  private getMarqueeRect(): Rect | null {
    if (!this.state.marqueeStart || !this.state.marqueeEnd) return null;

    const start = this.state.marqueeStart;
    const end = this.state.marqueeEnd;

    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  private pointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  private rectsIntersect(a: Rect, b: Rect): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  /**
   * Check if rect 'a' fully contains rect 'b' (for window selection)
   */
  private rectContains(a: Rect, b: Rect): boolean {
    return (
      b.x >= a.x &&
      b.y >= a.y &&
      b.x + b.width <= a.x + a.width &&
      b.y + b.height <= a.y + a.height
    );
  }

  /**
   * Determine if current marquee is window selection (left-to-right) or crossing selection (right-to-left)
   * Window selection: drag from left to right - selects only fully contained objects
   * Crossing selection: drag from right to left - selects any intersecting objects
   */
  private isWindowSelection(): boolean {
    if (!this.state.marqueeStart || !this.state.marqueeEnd) return true;
    return this.state.marqueeEnd.x >= this.state.marqueeStart.x;
  }

  private selectAll(context: ToolContext): void {
    const allNodes: NodeId[] = [];
    const doc = context.sceneGraph.getDocument();
    if (!doc) return;

    const pageIds = context.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return;

    const pageId = pageIds[0]!;
    this.collectSelectableNodes(pageId, context.sceneGraph, allNodes);
    this.updateSelection(allNodes, context);
  }

  private collectSelectableNodes(nodeId: NodeId, sceneGraph: SceneGraph, result: NodeId[]): void {
    const node = sceneGraph.getNode(nodeId);
    if (!node) return;

    if (node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      result.push(nodeId);
    }

    const childIds = sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.collectSelectableNodes(childId, sceneGraph, result);
    }
  }

  private renderSelectionHandles(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();
    // Scale UI elements inversely with zoom so they appear constant size on screen
    const scaledHandleSize = this.handleSize / zoom;
    const borderWidth = 2 / zoom;
    const handleBorderWidth = 1 / zoom;

    for (const nodeId of context.selectedNodeIds) {
      // Use world bounds to account for parent transforms
      const worldBounds = context.sceneGraph.getWorldBounds(nodeId);
      if (!worldBounds) continue;

      const bounds = worldBounds;

      ctx.save();

      // Draw selection border
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // Draw all 8 handles
      const handlePositions = this.getHandlePositions(bounds);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = handleBorderWidth;

      for (const pos of Object.values(handlePositions)) {
        ctx.fillRect(
          pos.x - scaledHandleSize / 2,
          pos.y - scaledHandleSize / 2,
          scaledHandleSize,
          scaledHandleSize
        );
        ctx.strokeRect(
          pos.x - scaledHandleSize / 2,
          pos.y - scaledHandleSize / 2,
          scaledHandleSize,
          scaledHandleSize
        );
      }

      ctx.restore();
    }
  }

  private getHandlePositions(bounds: Rect): Record<HandlePosition, Point> {
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

  private hitTestHandles(point: Point, bounds: Rect, zoom: number): HandlePosition | null {
    const handles = this.getHandlePositions(bounds);
    // Scale hit area inversely with zoom to match visual size
    const halfSize = (this.handleSize / zoom) / 2;

    for (const [position, handlePoint] of Object.entries(handles)) {
      if (
        point.x >= handlePoint.x - halfSize &&
        point.x <= handlePoint.x + halfSize &&
        point.y >= handlePoint.y - halfSize &&
        point.y <= handlePoint.y + halfSize
      ) {
        return position as HandlePosition;
      }
    }

    return null;
  }

  /**
   * Hit test for rotation zone (outside corners)
   */
  private hitTestRotationZone(point: Point, bounds: Rect, zoom: number): RotationCorner | null {
    const corners: Record<RotationCorner, Point> = {
      nw: { x: bounds.x, y: bounds.y },
      ne: { x: bounds.x + bounds.width, y: bounds.y },
      sw: { x: bounds.x, y: bounds.y + bounds.height },
      se: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    };

    const innerRadius = this.rotationZoneInner / zoom;
    const outerRadius = this.rotationZoneOuter / zoom;

    for (const [corner, pos] of Object.entries(corners)) {
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > innerRadius && dist <= outerRadius) {
        return corner as RotationCorner;
      }
    }
    return null;
  }

  /**
   * Calculate angle from pivot to point (in degrees, 0° = right, counter-clockwise positive)
   */
  private calculateAngle(pivot: Point, point: Point): number {
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    // atan2 gives angle in radians, convert to degrees
    // Negate y because canvas y increases downward
    return Math.atan2(-dy, dx) * 180 / Math.PI;
  }

  /**
   * Snap angle to nearest increment
   */
  private snapAngle(angle: number, increment: number): number {
    return Math.round(angle / increment) * increment;
  }

  /**
   * Normalize angle to 0-360 range
   */
  private normalizeAngle(angle: number): number {
    angle = angle % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * Rotate a point around a pivot
   */
  private rotatePoint(point: Point, pivot: Point, angleDegrees: number): Point {
    const rad = angleDegrees * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    return {
      x: pivot.x + dx * cos - dy * sin,
      y: pivot.y + dx * sin + dy * cos,
    };
  }

  private getHandleCursor(handle: HandlePosition): ToolCursor {
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
      default:
        return 'default';
    }
  }

  private calculateResizedBounds(
    startBounds: Rect,
    handle: HandlePosition,
    startPoint: Point,
    currentPoint: Point,
    preserveAspectRatio: boolean
  ): Rect {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;

    let { x, y, width, height } = startBounds;
    const minSize = 1;

    switch (handle) {
      case 'nw':
        x += dx;
        y += dy;
        width -= dx;
        height -= dy;
        break;
      case 'n':
        y += dy;
        height -= dy;
        break;
      case 'ne':
        y += dy;
        width += dx;
        height -= dy;
        break;
      case 'w':
        x += dx;
        width -= dx;
        break;
      case 'e':
        width += dx;
        break;
      case 'sw':
        x += dx;
        width -= dx;
        height += dy;
        break;
      case 's':
        height += dy;
        break;
      case 'se':
        width += dx;
        height += dy;
        break;
    }

    // Preserve aspect ratio if shift is held
    if (preserveAspectRatio && startBounds.width > 0 && startBounds.height > 0) {
      const aspectRatio = startBounds.width / startBounds.height;
      const isCorner = ['nw', 'ne', 'sw', 'se'].includes(handle);

      if (isCorner) {
        // Adjust to maintain aspect ratio
        const newAspectRatio = width / height;
        if (newAspectRatio > aspectRatio) {
          // Width is too large, adjust it
          const targetWidth = height * aspectRatio;
          if (handle === 'nw' || handle === 'sw') {
            x += width - targetWidth;
          }
          width = targetWidth;
        } else {
          // Height is too large, adjust it
          const targetHeight = width / aspectRatio;
          if (handle === 'nw' || handle === 'ne') {
            y += height - targetHeight;
          }
          height = targetHeight;
        }
      }
    }

    // Ensure minimum size
    if (width < minSize) {
      if (handle.includes('w')) {
        x = startBounds.x + startBounds.width - minSize;
      }
      width = minSize;
    }
    if (height < minSize) {
      if (handle.includes('n')) {
        y = startBounds.y + startBounds.height - minSize;
      }
      height = minSize;
    }

    return { x, y, width, height };
  }
}

/**
 * Create a select tool.
 */
export function createSelectTool(options?: {
  onSelectionChange?: (nodeIds: NodeId[]) => void;
}): SelectTool {
  return new SelectTool(options);
}
