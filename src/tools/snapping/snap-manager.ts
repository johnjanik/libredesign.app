/**
 * Snap Manager
 *
 * Manages object snapping for precise drawing and editing.
 * Supports:
 * - Endpoint snap
 * - Midpoint snap
 * - Center snap
 * - Intersection snap
 * - Grid snap
 * - Perpendicular snap
 * - Tangent snap
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import type { NodeData, FrameNodeData, VectorNodeData } from '@scene/nodes/base-node';

/**
 * Snap point type
 */
export type SnapType =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'grid'
  | 'perpendicular'
  | 'tangent'
  | 'nearest';

/**
 * Snap point result
 */
export interface SnapPoint {
  /** Snapped position */
  readonly point: Point;
  /** Type of snap */
  readonly type: SnapType;
  /** Source node ID (if from a node) */
  readonly nodeId?: NodeId;
  /** Distance to cursor */
  readonly distance: number;
}

/**
 * Alignment guide for visual feedback
 */
export interface AlignmentGuide {
  /** Guide type: horizontal or vertical */
  readonly type: 'horizontal' | 'vertical';
  /** Position of the guide line */
  readonly position: number;
  /** Start point of the guide line */
  readonly start: number;
  /** End point of the guide line */
  readonly end: number;
  /** Cursor position on the guide */
  readonly cursorPosition: Point;
  /** Source points that created this guide */
  readonly sourcePoints: Point[];
}

/**
 * Snap configuration
 */
export interface SnapConfig {
  /** Enable endpoint snapping */
  endpoint: boolean;
  /** Enable midpoint snapping */
  midpoint: boolean;
  /** Enable center snapping */
  center: boolean;
  /** Enable intersection snapping */
  intersection: boolean;
  /** Enable grid snapping */
  grid: boolean;
  /** Enable perpendicular snapping */
  perpendicular: boolean;
  /** Enable tangent snapping */
  tangent: boolean;
  /** Enable nearest point snapping */
  nearest: boolean;
  /** Grid size for grid snapping */
  gridSize: number;
  /** Snap aperture (distance threshold) */
  aperture: number;
}

const DEFAULT_CONFIG: SnapConfig = {
  endpoint: true,
  midpoint: true,
  center: true,
  intersection: true,
  grid: true,
  perpendicular: false,
  tangent: false,
  nearest: false,
  gridSize: 10,
  aperture: 10,
};

/**
 * Snap Manager for object snapping
 */
export class SnapManager {
  private config: SnapConfig;
  private enabled: boolean = true;
  private nodes: Map<NodeId, NodeData> = new Map();

  constructor(config: Partial<SnapConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): SnapConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable snapping.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if snapping is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update nodes for snapping.
   */
  updateNodes(nodes: Map<NodeId, NodeData>): void {
    this.nodes = nodes;
  }

  /**
   * Find snap point for cursor position.
   */
  findSnapPoint(cursor: Point, zoom: number, excludeNodes?: Set<NodeId>): SnapPoint | null {
    if (!this.enabled) return null;

    const aperture = this.config.aperture / zoom;
    const candidates: SnapPoint[] = [];

    // Collect all snap candidates
    if (this.config.grid) {
      const gridSnap = this.findGridSnap(cursor);
      if (gridSnap && gridSnap.distance <= aperture) {
        candidates.push(gridSnap);
      }
    }

    // Object snaps
    for (const [nodeId, node] of this.nodes) {
      if (excludeNodes?.has(nodeId)) continue;
      if (!this.isSnapableNode(node)) continue;

      const nodeSnaps = this.findNodeSnapPoints(cursor, nodeId, node, aperture);
      candidates.push(...nodeSnaps);
    }

    // Find intersection snaps
    if (this.config.intersection) {
      const intersections = this.findIntersectionSnaps(cursor, aperture, excludeNodes);
      candidates.push(...intersections);
    }

    // Return closest snap point
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0]!;
  }

  /**
   * Find grid snap point.
   */
  private findGridSnap(cursor: Point): SnapPoint {
    const gridSize = this.config.gridSize;
    const snappedX = Math.round(cursor.x / gridSize) * gridSize;
    const snappedY = Math.round(cursor.y / gridSize) * gridSize;

    const distance = Math.sqrt(
      Math.pow(cursor.x - snappedX, 2) + Math.pow(cursor.y - snappedY, 2)
    );

    return {
      point: { x: snappedX, y: snappedY },
      type: 'grid',
      distance,
    };
  }

  /**
   * Find snap points for a node.
   */
  private findNodeSnapPoints(cursor: Point, nodeId: NodeId, node: NodeData, aperture: number): SnapPoint[] {
    const snaps: SnapPoint[] = [];

    if (!('x' in node) || !('y' in node)) return snaps;

    const frameNode = node as FrameNodeData;
    const x = frameNode.x ?? 0;
    const y = frameNode.y ?? 0;
    const width = frameNode.width ?? 0;
    const height = frameNode.height ?? 0;

    // Endpoint snaps (corners)
    if (this.config.endpoint) {
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];

      for (const corner of corners) {
        const dist = this.distance(cursor, corner);
        if (dist <= aperture) {
          snaps.push({ point: corner, type: 'endpoint', nodeId, distance: dist });
        }
      }
    }

    // Midpoint snaps (edge midpoints)
    if (this.config.midpoint) {
      const midpoints = [
        { x: x + width / 2, y }, // Top
        { x: x + width, y: y + height / 2 }, // Right
        { x: x + width / 2, y: y + height }, // Bottom
        { x, y: y + height / 2 }, // Left
      ];

      for (const midpoint of midpoints) {
        const dist = this.distance(cursor, midpoint);
        if (dist <= aperture) {
          snaps.push({ point: midpoint, type: 'midpoint', nodeId, distance: dist });
        }
      }
    }

    // Center snap
    if (this.config.center) {
      const center = { x: x + width / 2, y: y + height / 2 };
      const dist = this.distance(cursor, center);
      if (dist <= aperture) {
        snaps.push({ point: center, type: 'center', nodeId, distance: dist });
      }
    }

    // For vector nodes, also check path endpoints
    if ('vectorPaths' in node && this.config.endpoint) {
      const vectorNode = node as VectorNodeData;
      const pathSnaps = this.findPathSnapPoints(cursor, nodeId, vectorNode, x, y, aperture);
      snaps.push(...pathSnaps);
    }

    return snaps;
  }

  /**
   * Find snap points from vector paths.
   */
  private findPathSnapPoints(
    cursor: Point,
    nodeId: NodeId,
    node: VectorNodeData,
    offsetX: number,
    offsetY: number,
    aperture: number
  ): SnapPoint[] {
    const snaps: SnapPoint[] = [];

    for (const path of node.vectorPaths ?? []) {
      let currentX = 0;
      let currentY = 0;
      let startX = 0;
      let startY = 0;
      let prevX = 0;
      let prevY = 0;

      for (const cmd of path.commands) {
        if (cmd.type === 'M') {
          currentX = cmd.x;
          currentY = cmd.y;
          startX = currentX;
          startY = currentY;

          // Endpoint snap
          const point = { x: currentX + offsetX, y: currentY + offsetY };
          const dist = this.distance(cursor, point);
          if (dist <= aperture) {
            snaps.push({ point, type: 'endpoint', nodeId, distance: dist });
          }
        } else if (cmd.type === 'L') {
          prevX = currentX;
          prevY = currentY;
          currentX = cmd.x;
          currentY = cmd.y;

          // Endpoint snap
          const point = { x: currentX + offsetX, y: currentY + offsetY };
          const dist = this.distance(cursor, point);
          if (dist <= aperture) {
            snaps.push({ point, type: 'endpoint', nodeId, distance: dist });
          }

          // Midpoint snap
          if (this.config.midpoint) {
            const midpoint = {
              x: (prevX + currentX) / 2 + offsetX,
              y: (prevY + currentY) / 2 + offsetY,
            };
            const midDist = this.distance(cursor, midpoint);
            if (midDist <= aperture) {
              snaps.push({ point: midpoint, type: 'midpoint', nodeId, distance: midDist });
            }
          }
        } else if (cmd.type === 'C') {
          prevX = currentX;
          prevY = currentY;
          currentX = cmd.x;
          currentY = cmd.y;

          // Endpoint snap
          const point = { x: currentX + offsetX, y: currentY + offsetY };
          const dist = this.distance(cursor, point);
          if (dist <= aperture) {
            snaps.push({ point, type: 'endpoint', nodeId, distance: dist });
          }
        } else if (cmd.type === 'Z') {
          // Line back to start - check midpoint
          if (this.config.midpoint) {
            const midpoint = {
              x: (currentX + startX) / 2 + offsetX,
              y: (currentY + startY) / 2 + offsetY,
            };
            const midDist = this.distance(cursor, midpoint);
            if (midDist <= aperture) {
              snaps.push({ point: midpoint, type: 'midpoint', nodeId, distance: midDist });
            }
          }
        }
      }
    }

    return snaps;
  }

  /**
   * Find intersection snap points.
   */
  private findIntersectionSnaps(cursor: Point, aperture: number, excludeNodes?: Set<NodeId>): SnapPoint[] {
    const snaps: SnapPoint[] = [];
    const segments: Array<{ p1: Point; p2: Point; nodeId: NodeId }> = [];

    // Collect all line segments from nodes
    for (const [nodeId, node] of this.nodes) {
      if (excludeNodes?.has(nodeId)) continue;
      if (!this.isSnapableNode(node)) continue;

      const nodeSegments = this.getNodeSegments(nodeId, node);
      segments.push(...nodeSegments);
    }

    // Find intersections between segments
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i]!;
        const seg2 = segments[j]!;

        const intersection = this.lineLineIntersection(seg1.p1, seg1.p2, seg2.p1, seg2.p2);
        if (intersection) {
          const dist = this.distance(cursor, intersection);
          if (dist <= aperture) {
            snaps.push({ point: intersection, type: 'intersection', distance: dist });
          }
        }
      }
    }

    return snaps;
  }

  /**
   * Get line segments from a node.
   */
  private getNodeSegments(nodeId: NodeId, node: NodeData): Array<{ p1: Point; p2: Point; nodeId: NodeId }> {
    const segments: Array<{ p1: Point; p2: Point; nodeId: NodeId }> = [];

    if (!('x' in node) || !('y' in node)) return segments;

    const frameNode = node as FrameNodeData;
    const x = frameNode.x ?? 0;
    const y = frameNode.y ?? 0;
    const width = frameNode.width ?? 0;
    const height = frameNode.height ?? 0;

    // Add bounding box edges
    segments.push(
      { p1: { x, y }, p2: { x: x + width, y }, nodeId },
      { p1: { x: x + width, y }, p2: { x: x + width, y: y + height }, nodeId },
      { p1: { x: x + width, y: y + height }, p2: { x, y: y + height }, nodeId },
      { p1: { x, y: y + height }, p2: { x, y }, nodeId }
    );

    return segments;
  }

  /**
   * Line-line intersection.
   */
  private lineLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
  }

  /**
   * Check if node is snapable.
   */
  private isSnapableNode(node: NodeData): boolean {
    return (
      node.type === 'FRAME' ||
      node.type === 'VECTOR' ||
      node.type === 'GROUP' ||
      node.type === 'TEXT' ||
      node.type === 'IMAGE'
    );
  }

  /**
   * Calculate distance between two points.
   */
  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Find alignment guides for cursor position.
   * Returns guides when cursor aligns with node centers, edges, etc.
   */
  findAlignmentGuides(cursor: Point, zoom: number, excludeNodes?: Set<NodeId>): AlignmentGuide[] {
    if (!this.enabled) return [];

    const guides: AlignmentGuide[] = [];
    const tolerance = 3 / zoom; // 3 screen pixels tolerance

    // Collect all alignment points from nodes
    const alignmentPoints: Array<{ point: Point; nodeId: NodeId }> = [];

    for (const [nodeId, node] of this.nodes) {
      if (excludeNodes?.has(nodeId)) continue;
      if (!this.isSnapableNode(node)) continue;
      if (!('x' in node) || !('y' in node)) continue;

      const frameNode = node as FrameNodeData;
      const x = frameNode.x ?? 0;
      const y = frameNode.y ?? 0;
      const width = frameNode.width ?? 0;
      const height = frameNode.height ?? 0;

      // Center point
      alignmentPoints.push({ point: { x: x + width / 2, y: y + height / 2 }, nodeId });

      // Edge centers
      alignmentPoints.push({ point: { x: x + width / 2, y }, nodeId }); // Top
      alignmentPoints.push({ point: { x: x + width, y: y + height / 2 }, nodeId }); // Right
      alignmentPoints.push({ point: { x: x + width / 2, y: y + height }, nodeId }); // Bottom
      alignmentPoints.push({ point: { x, y: y + height / 2 }, nodeId }); // Left

      // Corners
      alignmentPoints.push({ point: { x, y }, nodeId });
      alignmentPoints.push({ point: { x: x + width, y }, nodeId });
      alignmentPoints.push({ point: { x: x + width, y: y + height }, nodeId });
      alignmentPoints.push({ point: { x, y: y + height }, nodeId });
    }

    // Find horizontal alignments (same Y)
    const horizontalMatches: Point[] = [];
    for (const { point } of alignmentPoints) {
      if (Math.abs(cursor.y - point.y) <= tolerance) {
        horizontalMatches.push(point);
      }
    }

    if (horizontalMatches.length > 0) {
      // Calculate extent of the guide line
      let minX = cursor.x;
      let maxX = cursor.x;
      for (const p of horizontalMatches) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      }

      guides.push({
        type: 'horizontal',
        position: horizontalMatches[0]!.y,
        start: minX - 50,
        end: maxX + 50,
        cursorPosition: cursor,
        sourcePoints: horizontalMatches,
      });
    }

    // Find vertical alignments (same X)
    const verticalMatches: Point[] = [];
    for (const { point } of alignmentPoints) {
      if (Math.abs(cursor.x - point.x) <= tolerance) {
        verticalMatches.push(point);
      }
    }

    if (verticalMatches.length > 0) {
      // Calculate extent of the guide line
      let minY = cursor.y;
      let maxY = cursor.y;
      for (const p of verticalMatches) {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }

      guides.push({
        type: 'vertical',
        position: verticalMatches[0]!.x,
        start: minY - 50,
        end: maxY + 50,
        cursorPosition: cursor,
        sourcePoints: verticalMatches,
      });
    }

    return guides;
  }

  /**
   * Render alignment guides.
   */
  renderAlignmentGuides(ctx: CanvasRenderingContext2D, guides: AlignmentGuide[], zoom: number): void {
    if (guides.length === 0) return;

    ctx.save();

    // Red color for alignment guides
    ctx.strokeStyle = '#FF0000';
    ctx.fillStyle = '#FF0000';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([6 / zoom, 3 / zoom]);

    for (const guide of guides) {
      ctx.beginPath();

      if (guide.type === 'horizontal') {
        ctx.moveTo(guide.start, guide.position);
        ctx.lineTo(guide.end, guide.position);
      } else {
        ctx.moveTo(guide.position, guide.start);
        ctx.lineTo(guide.position, guide.end);
      }

      ctx.stroke();

      // Draw small markers at source points
      ctx.setLineDash([]);
      const markerSize = 4 / zoom;
      for (const point of guide.sourcePoints) {
        ctx.beginPath();
        if (guide.type === 'horizontal') {
          ctx.moveTo(point.x, point.y - markerSize);
          ctx.lineTo(point.x, point.y + markerSize);
        } else {
          ctx.moveTo(point.x - markerSize, point.y);
          ctx.lineTo(point.x + markerSize, point.y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([6 / zoom, 3 / zoom]);
    }

    ctx.restore();
  }

  /**
   * Render snap indicators.
   */
  render(ctx: CanvasRenderingContext2D, snap: SnapPoint | null, zoom: number): void {
    if (!snap) return;

    const size = 14 / zoom; // Larger size for better visibility
    const { point, type } = snap;

    ctx.save();

    // Draw snap indicator based on type - use bright magenta for high visibility
    const mainColor = '#FF00FF'; // Bright magenta
    const fillColor = 'rgba(255, 0, 255, 0.3)';
    ctx.strokeStyle = mainColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = 2.5 / zoom; // Thicker lines

    switch (type) {
      case 'endpoint':
        // Filled square with border
        ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
        ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
        break;

      case 'midpoint':
        // Filled triangle
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x + size / 2, point.y + size / 2);
        ctx.lineTo(point.x - size / 2, point.y + size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'center':
        // Filled circle with crosshair
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Add crosshair
        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y);
        ctx.lineTo(point.x + size, point.y);
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x, point.y + size);
        ctx.stroke();
        break;

      case 'intersection':
        // Bold X with circle
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y - size / 2);
        ctx.lineTo(point.x + size / 2, point.y + size / 2);
        ctx.moveTo(point.x + size / 2, point.y - size / 2);
        ctx.lineTo(point.x - size / 2, point.y + size / 2);
        ctx.stroke();
        break;

      case 'grid':
        // Plus with circle background
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.moveTo(point.x - size * 0.7, point.y);
        ctx.lineTo(point.x + size * 0.7, point.y);
        ctx.moveTo(point.x, point.y - size * 0.7);
        ctx.lineTo(point.x, point.y + size * 0.7);
        ctx.stroke();
        break;

      case 'perpendicular':
        // Right angle with fill
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y);
        ctx.lineTo(point.x, point.y);
        ctx.lineTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x - size / 2, point.y - size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'tangent':
        // Circle with line
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y + size / 3);
        ctx.lineTo(point.x + size / 2, point.y + size / 3);
        ctx.stroke();
        break;

      default:
        // Filled diamond
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x + size / 2, point.y);
        ctx.lineTo(point.x, point.y + size / 2);
        ctx.lineTo(point.x - size / 2, point.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Draw prominent label with background
    const fontSize = 11 / zoom;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const labelX = point.x + size;
    const labelY = point.y - size / 2;

    // Label background
    const metrics = ctx.measureText(label);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(labelX - 2 / zoom, labelY - fontSize, metrics.width + 4 / zoom, fontSize + 4 / zoom);

    // Label text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
  }
}

/**
 * Create a snap manager.
 */
export function createSnapManager(config?: Partial<SnapConfig>): SnapManager {
  return new SnapManager(config);
}
