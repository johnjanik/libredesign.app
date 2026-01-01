/**
 * Polygon Tool
 *
 * Creates regular polygons (triangles, pentagons, hexagons, etc.) by click-and-drag.
 * Supports:
 * - Configurable number of sides
 * - Shift to constrain rotation to 15-degree increments
 * - Alt to draw from center
 * - Arrow keys to adjust side count while drawing
 */

import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/**
 * Polygon tool options
 */
export interface PolygonToolOptions {
  /** Minimum size to create a shape (pixels) */
  readonly minSize?: number;
  /** Default number of sides */
  readonly sides?: number;
  /** Minimum number of sides */
  readonly minSides?: number;
  /** Maximum number of sides */
  readonly maxSides?: number;
  /** Fill color */
  readonly fillColor?: { r: number; g: number; b: number; a: number };
  /** Default rotation offset in radians (0 = first vertex points right) */
  readonly rotationOffset?: number;
}

const DEFAULT_OPTIONS: Required<PolygonToolOptions> = {
  minSize: 2,
  sides: 6,
  minSides: 3,
  maxSides: 32,
  fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
  rotationOffset: -Math.PI / 2, // First vertex points up
};

/**
 * Polygon vertex data
 */
export interface PolygonData {
  /** Center point */
  readonly center: Point;
  /** Radius (distance from center to vertices) */
  readonly radius: number;
  /** Number of sides */
  readonly sides: number;
  /** Rotation in radians */
  readonly rotation: number;
  /** Vertex positions */
  readonly vertices: readonly Point[];
  /** Bounding box */
  readonly bounds: Rect;
}

/**
 * Polygon tool for creating regular polygon nodes
 */
export class PolygonTool extends BaseTool {
  readonly name = 'polygon';
  cursor: ToolCursor = 'crosshair';

  private options: Required<PolygonToolOptions>;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private sides: number;
  private constrainRotation = false;
  private drawFromCenter = false;
  private currentRotation = 0;
  private createdNodeId: NodeId | null = null;

  // Callbacks
  private onPolygonComplete?: (polygon: PolygonData) => NodeId | null;
  private onPreviewUpdate?: () => void;

  constructor(options: PolygonToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.sides = this.options.sides;
  }

  /**
   * Set callback for when polygon is completed.
   */
  setOnPolygonComplete(callback: (polygon: PolygonData) => NodeId | null): void {
    this.onPolygonComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Get current number of sides.
   */
  getSides(): number {
    return this.sides;
  }

  /**
   * Set number of sides.
   */
  setSides(sides: number): void {
    this.sides = Math.max(
      this.options.minSides,
      Math.min(this.options.maxSides, sides)
    );
    this.onPreviewUpdate?.();
  }

  /**
   * Check if currently drawing.
   */
  isDrawing(): boolean {
    return this.startPoint !== null;
  }

  /**
   * Get current preview polygon.
   */
  getPreviewPolygon(): PolygonData | null {
    if (!this.startPoint || !this.currentPoint) return null;
    return this.calculatePolygon(this.startPoint, this.currentPoint);
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  override deactivate(): void {
    this.reset();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    this.startPoint = { x: event.worldX, y: event.worldY };
    this.currentPoint = this.startPoint;
    this.constrainRotation = event.shiftKey;
    this.drawFromCenter = event.altKey;
    this.currentRotation = this.options.rotationOffset;
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    if (!this.startPoint) return;

    this.currentPoint = { x: event.worldX, y: event.worldY };
    this.constrainRotation = event.shiftKey;
    this.drawFromCenter = event.altKey;

    // Calculate rotation based on drag direction
    const dx = this.currentPoint.x - this.startPoint.x;
    const dy = this.currentPoint.y - this.startPoint.y;
    this.currentRotation = Math.atan2(dy, dx) + this.options.rotationOffset;

    if (this.constrainRotation) {
      // Snap to 15-degree increments
      const snapAngle = Math.PI / 12;
      this.currentRotation = Math.round(this.currentRotation / snapAngle) * snapAngle;
    }

    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    if (!this.startPoint) return;

    this.currentPoint = { x: event.worldX, y: event.worldY };
    this.constrainRotation = event.shiftKey;
    this.drawFromCenter = event.altKey;

    const polygon = this.calculatePolygon(this.startPoint, this.currentPoint);

    // Check minimum size
    const minSize = this.options.minSize / context.viewport.getZoom();
    if (polygon.radius >= minSize / 2) {
      if (this.onPolygonComplete) {
        this.createdNodeId = this.onPolygonComplete(polygon);
      }
    }

    this.reset();
    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape' && this.startPoint) {
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Shift') {
      this.constrainRotation = true;
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Alt') {
      this.drawFromCenter = true;
      this.onPreviewUpdate?.();
      return true;
    }

    // Adjust sides with arrow keys
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      this.setSides(this.sides + 1);
      return true;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      this.setSides(this.sides - 1);
      return true;
    }

    // Number keys for quick side selection
    const num = parseInt(event.key, 10);
    if (num >= 3 && num <= 9) {
      this.setSides(num);
      return true;
    }

    return false;
  }

  override onKeyUp(event: KeyEventData, _context: ToolContext): void {
    if (event.key === 'Shift') {
      this.constrainRotation = false;
      this.onPreviewUpdate?.();
    }

    if (event.key === 'Alt') {
      this.drawFromCenter = false;
      this.onPreviewUpdate?.();
    }
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const polygon = this.getPreviewPolygon();
    if (!polygon) return;

    const viewport = context.viewport;

    ctx.save();

    // Canvas container already applies viewport transform, so we render in world coords
    // Draw preview polygon
    ctx.beginPath();
    const vertices = polygon.vertices;
    if (vertices.length > 0) {
      ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i]!.x, vertices[i]!.y);
      }
      ctx.closePath();
    }

    ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
    ctx.fill();

    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1 / viewport.getZoom();
    ctx.stroke();

    // Draw center point
    ctx.beginPath();
    ctx.arc(polygon.center.x, polygon.center.y, 3 / viewport.getZoom(), 0, Math.PI * 2);
    ctx.fillStyle = '#0066FF';
    ctx.fill();

    // Draw radius line
    ctx.beginPath();
    ctx.moveTo(polygon.center.x, polygon.center.y);
    ctx.lineTo(vertices[0]!.x, vertices[0]!.y);
    ctx.strokeStyle = 'rgba(0, 102, 255, 0.5)';
    ctx.setLineDash([4 / viewport.getZoom(), 4 / viewport.getZoom()]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw info
    const fontSize = 12 / viewport.getZoom();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#0066FF';
    ctx.textAlign = 'center';

    // Show sides count and dimensions
    const infoY = polygon.bounds.y + polygon.bounds.height + fontSize * 1.5;
    ctx.fillText(
      `${this.sides} sides • r=${Math.round(polygon.radius)}`,
      polygon.center.x,
      infoY
    );

    ctx.restore();
  }

  /**
   * Calculate polygon from start and end points.
   */
  private calculatePolygon(start: Point, end: Point): PolygonData {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let center: Point;
    let radius: number;

    if (this.drawFromCenter) {
      // Draw from center
      center = start;
      radius = distance;
    } else {
      // Draw from edge
      center = {
        x: start.x + dx / 2,
        y: start.y + dy / 2,
      };
      radius = distance / 2;
    }

    // Calculate vertices
    const vertices: Point[] = [];
    const angleStep = (Math.PI * 2) / this.sides;

    for (let i = 0; i < this.sides; i++) {
      const angle = this.currentRotation + angleStep * i;
      vertices.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }

    const bounds: Rect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    return {
      center,
      radius,
      sides: this.sides,
      rotation: this.currentRotation,
      vertices,
      bounds,
    };
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.startPoint = null;
    this.currentPoint = null;
    this.constrainRotation = false;
    this.drawFromCenter = false;
    this.currentRotation = this.options.rotationOffset;
  }

  /**
   * Get the ID of the last created node.
   */
  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }

  /**
   * Generate SVG path data for the polygon.
   */
  static generateSVGPath(polygon: PolygonData): string {
    if (polygon.vertices.length === 0) return '';

    const parts: string[] = [];
    const v = polygon.vertices;

    parts.push(`M ${v[0]!.x} ${v[0]!.y}`);
    for (let i = 1; i < v.length; i++) {
      parts.push(`L ${v[i]!.x} ${v[i]!.y}`);
    }
    parts.push('Z');

    return parts.join(' ');
  }

  /**
   * Generate triangulated indices for the polygon (for WebGL rendering).
   */
  static triangulate(sides: number): Uint16Array {
    // Fan triangulation from center
    const indices: number[] = [];

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      indices.push(sides); // Center vertex index
      indices.push(i);
      indices.push(next);
    }

    return new Uint16Array(indices);
  }

  /**
   * Generate vertex buffer for the polygon (for WebGL rendering).
   * Returns center + perimeter vertices.
   */
  static generateVertexBuffer(polygon: PolygonData): Float32Array {
    const vertices = new Float32Array((polygon.sides + 1) * 2);

    // Perimeter vertices
    for (let i = 0; i < polygon.sides; i++) {
      vertices[i * 2] = polygon.vertices[i]!.x;
      vertices[i * 2 + 1] = polygon.vertices[i]!.y;
    }

    // Center vertex
    vertices[polygon.sides * 2] = polygon.center.x;
    vertices[polygon.sides * 2 + 1] = polygon.center.y;

    return vertices;
  }
}

/**
 * Create a polygon tool.
 */
export function createPolygonTool(options?: PolygonToolOptions): PolygonTool {
  return new PolygonTool(options);
}
