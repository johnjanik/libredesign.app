/**
 * Distance Tool
 *
 * Measures distances between elements.
 */

import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type { NodeData } from '@scene/nodes/base-node';
import { isSceneNode } from '@scene/nodes/base-node';
import type { Viewport } from '@renderer/core/viewport';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type ToolCursor,
} from '@tools/base/tool';

/** Measurement between two points */
export interface Measurement {
  readonly type: 'horizontal' | 'vertical' | 'diagonal';
  readonly from: Point;
  readonly to: Point;
  readonly distance: number;
}

/** Distance tool options */
export interface DistanceToolOptions {
  /** Color for measurement lines */
  lineColor?: string;
  /** Color for measurement text */
  textColor?: string;
  /** Show grid alignment guides */
  showGuides?: boolean;
}

/**
 * Distance Tool
 *
 * Shows measurements between the selected element and hovered element.
 */
export class DistanceTool extends BaseTool {
  readonly name = 'distance';
  cursor: ToolCursor = 'crosshair';

  private hoveredNodeId: NodeId | null = null;
  private measurements: Measurement[] = [];
  private options: Required<DistanceToolOptions>;

  constructor(options: DistanceToolOptions = {}) {
    super();
    this.options = {
      lineColor: options.lineColor ?? '#ff00ff',
      textColor: options.textColor ?? '#ffffff',
      showGuides: options.showGuides ?? true,
    };
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.measurements = [];
  }

  override deactivate(): void {
    super.deactivate();
    this.hoveredNodeId = null;
    this.measurements = [];
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    // Find node under cursor
    const hitNode = this.hitTest(event.worldX, event.worldY, context);

    // Skip if same node or selected node
    if (hitNode && context.selectedNodeIds.includes(hitNode)) {
      this.hoveredNodeId = null;
      this.measurements = [];
      return;
    }

    this.hoveredNodeId = hitNode;

    // Calculate measurements if we have selection and hovered node
    if (context.selectedNodeIds.length > 0 && this.hoveredNodeId) {
      const selectedId = context.selectedNodeIds[0]!;
      this.measurements = this.calculateDistances(selectedId, this.hoveredNodeId, context);
    } else if (context.selectedNodeIds.length > 0) {
      // Show distance to canvas edges or cursor
      const selectedId = context.selectedNodeIds[0]!;
      this.measurements = this.calculateDistancesToPoint(
        selectedId,
        { x: event.worldX, y: event.worldY },
        context
      );
    } else {
      this.measurements = [];
    }
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (this.measurements.length === 0) return;

    ctx.save();

    for (const measurement of this.measurements) {
      this.renderMeasurementLine(ctx, measurement, context.viewport);
    }

    ctx.restore();
  }

  private hitTest(worldX: number, worldY: number, context: ToolContext): NodeId | null {
    // Get all nodes and find one that contains the point
    const doc = context.sceneGraph.getDocument();
    if (!doc) return null;

    // Collect all scene nodes
    const nodes: NodeData[] = [];
    const collectNodes = (nodeId: NodeId): void => {
      const node = context.sceneGraph.getNode(nodeId);
      if (!node) return;

      if (isSceneNode(node)) {
        nodes.push(node);
      }

      const childIds = context.sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        collectNodes(childId);
      }
    };

    const pages = context.sceneGraph.getChildIds(doc.id);
    for (const pageId of pages) {
      collectNodes(pageId);
    }

    // Reverse to check top-most first
    nodes.reverse();

    for (const node of nodes) {
      if (!isSceneNode(node)) continue;

      const n = node as { x: number; y: number; width: number; height: number };
      if (
        worldX >= n.x &&
        worldX <= n.x + n.width &&
        worldY >= n.y &&
        worldY <= n.y + n.height
      ) {
        return node.id;
      }
    }

    return null;
  }

  private calculateDistances(
    fromNodeId: NodeId,
    toNodeId: NodeId,
    context: ToolContext
  ): Measurement[] {
    const fromNode = context.sceneGraph.getNode(fromNodeId);
    const toNode = context.sceneGraph.getNode(toNodeId);

    if (!fromNode || !toNode) return [];
    if (!isSceneNode(fromNode) || !isSceneNode(toNode)) return [];

    const from = fromNode as { x: number; y: number; width: number; height: number };
    const to = toNode as { x: number; y: number; width: number; height: number };

    const measurements: Measurement[] = [];

    // Calculate bounds
    const fromLeft = from.x;
    const fromRight = from.x + from.width;
    const fromTop = from.y;
    const fromBottom = from.y + from.height;
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;

    const toLeft = to.x;
    const toRight = to.x + to.width;
    const toTop = to.y;
    const toBottom = to.y + to.height;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;

    // Horizontal distance
    let hDistance = 0;
    let hFrom: Point;
    let hTo: Point;

    if (fromRight <= toLeft) {
      // From is to the left of to
      hDistance = toLeft - fromRight;
      hFrom = { x: fromRight, y: fromCenterY };
      hTo = { x: toLeft, y: fromCenterY };
    } else if (fromLeft >= toRight) {
      // From is to the right of to
      hDistance = fromLeft - toRight;
      hFrom = { x: fromLeft, y: fromCenterY };
      hTo = { x: toRight, y: fromCenterY };
    } else {
      // Overlapping horizontally - show overlap
      hDistance = 0;
      hFrom = { x: fromCenterX, y: fromCenterY };
      hTo = { x: toCenterX, y: fromCenterY };
    }

    if (hDistance > 0) {
      measurements.push({
        type: 'horizontal',
        from: hFrom,
        to: hTo,
        distance: Math.round(hDistance),
      });
    }

    // Vertical distance
    let vDistance = 0;
    let vFrom: Point;
    let vTo: Point;

    if (fromBottom <= toTop) {
      // From is above to
      vDistance = toTop - fromBottom;
      vFrom = { x: fromCenterX, y: fromBottom };
      vTo = { x: fromCenterX, y: toTop };
    } else if (fromTop >= toBottom) {
      // From is below to
      vDistance = fromTop - toBottom;
      vFrom = { x: fromCenterX, y: fromTop };
      vTo = { x: fromCenterX, y: toBottom };
    } else {
      // Overlapping vertically
      vDistance = 0;
      vFrom = { x: fromCenterX, y: fromCenterY };
      vTo = { x: fromCenterX, y: toCenterY };
    }

    if (vDistance > 0) {
      measurements.push({
        type: 'vertical',
        from: vFrom,
        to: vTo,
        distance: Math.round(vDistance),
      });
    }

    return measurements;
  }

  private calculateDistancesToPoint(
    nodeId: NodeId,
    point: Point,
    context: ToolContext
  ): Measurement[] {
    const node = context.sceneGraph.getNode(nodeId);
    if (!node || !isSceneNode(node)) return [];

    const n = node as { x: number; y: number; width: number; height: number };
    const measurements: Measurement[] = [];

    const left = n.x;
    const right = n.x + n.width;
    const top = n.y;
    const bottom = n.y + n.height;
    const centerX = n.x + n.width / 2;
    const centerY = n.y + n.height / 2;

    // Horizontal distance to cursor
    if (point.x < left) {
      measurements.push({
        type: 'horizontal',
        from: { x: point.x, y: centerY },
        to: { x: left, y: centerY },
        distance: Math.round(left - point.x),
      });
    } else if (point.x > right) {
      measurements.push({
        type: 'horizontal',
        from: { x: right, y: centerY },
        to: { x: point.x, y: centerY },
        distance: Math.round(point.x - right),
      });
    }

    // Vertical distance to cursor
    if (point.y < top) {
      measurements.push({
        type: 'vertical',
        from: { x: centerX, y: point.y },
        to: { x: centerX, y: top },
        distance: Math.round(top - point.y),
      });
    } else if (point.y > bottom) {
      measurements.push({
        type: 'vertical',
        from: { x: centerX, y: bottom },
        to: { x: centerX, y: point.y },
        distance: Math.round(point.y - bottom),
      });
    }

    return measurements;
  }

  private renderMeasurementLine(
    ctx: CanvasRenderingContext2D,
    measurement: Measurement,
    viewport: Viewport
  ): void {
    const from = viewport.worldToCanvas(measurement.from.x, measurement.from.y);
    const to = viewport.worldToCanvas(measurement.to.x, measurement.to.y);

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = this.options.lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw end caps
    const capSize = 6;
    if (measurement.type === 'horizontal') {
      // Vertical end caps
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - capSize / 2);
      ctx.lineTo(from.x, from.y + capSize / 2);
      ctx.moveTo(to.x, to.y - capSize / 2);
      ctx.lineTo(to.x, to.y + capSize / 2);
      ctx.stroke();
    } else {
      // Horizontal end caps
      ctx.beginPath();
      ctx.moveTo(from.x - capSize / 2, from.y);
      ctx.lineTo(from.x + capSize / 2, from.y);
      ctx.moveTo(to.x - capSize / 2, to.y);
      ctx.lineTo(to.x + capSize / 2, to.y);
      ctx.stroke();
    }

    // Draw label
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const label = `${measurement.distance}px`;

    // Label background
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    const metrics = ctx.measureText(label);
    const padding = 4;
    const labelWidth = metrics.width + padding * 2;
    const labelHeight = 16;

    ctx.fillStyle = this.options.lineColor;
    ctx.fillRect(
      midX - labelWidth / 2,
      midY - labelHeight / 2,
      labelWidth,
      labelHeight
    );

    // Label text
    ctx.fillStyle = this.options.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY);
  }
}

/**
 * Create a distance tool.
 */
export function createDistanceTool(options?: DistanceToolOptions): DistanceTool {
  return new DistanceTool(options);
}
