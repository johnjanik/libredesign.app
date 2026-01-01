/**
 * Star Tool
 *
 * Creates star shapes by click-and-drag.
 * Supports:
 * - Configurable number of points
 * - Configurable inner radius ratio
 * - Shift to constrain rotation to 15-degree increments
 * - Alt to draw from center
 * - Arrow keys to adjust point count while drawing
 */

import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/**
 * Star tool options
 */
export interface StarToolOptions {
  /** Minimum size to create a shape (pixels) */
  readonly minSize?: number;
  /** Default number of points */
  readonly points?: number;
  /** Minimum number of points */
  readonly minPoints?: number;
  /** Maximum number of points */
  readonly maxPoints?: number;
  /** Inner radius ratio (0-1, where 0.5 is typical) */
  readonly innerRadiusRatio?: number;
  /** Fill color */
  readonly fillColor?: { r: number; g: number; b: number; a: number };
  /** Default rotation offset in radians (0 = first vertex points right) */
  readonly rotationOffset?: number;
}

const DEFAULT_OPTIONS: Required<StarToolOptions> = {
  minSize: 2,
  points: 5,
  minPoints: 3,
  maxPoints: 32,
  innerRadiusRatio: 0.4,
  fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
  rotationOffset: -Math.PI / 2, // First point points up
};

/**
 * Star vertex data
 */
export interface StarData {
  /** Center point */
  readonly center: Point;
  /** Outer radius (distance from center to outer points) */
  readonly outerRadius: number;
  /** Inner radius (distance from center to inner points) */
  readonly innerRadius: number;
  /** Number of points */
  readonly points: number;
  /** Rotation in radians */
  readonly rotation: number;
  /** Vertex positions (alternating outer/inner) */
  readonly vertices: readonly Point[];
  /** Bounding box */
  readonly bounds: Rect;
}

/**
 * Star tool for creating star shape nodes
 */
export class StarTool extends BaseTool {
  readonly name = 'star';
  cursor: ToolCursor = 'crosshair';

  private options: Required<StarToolOptions>;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private points: number;
  private innerRadiusRatio: number;
  private constrainRotation = false;
  private drawFromCenter = false;
  private currentRotation = 0;
  private createdNodeId: NodeId | null = null;

  // Callbacks
  private onStarComplete?: (star: StarData) => NodeId | null;
  private onPreviewUpdate?: () => void;

  constructor(options: StarToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.points = this.options.points;
    this.innerRadiusRatio = this.options.innerRadiusRatio;
  }

  /**
   * Set callback for when star is completed.
   */
  setOnStarComplete(callback: (star: StarData) => NodeId | null): void {
    this.onStarComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Get current number of points.
   */
  getPoints(): number {
    return this.points;
  }

  /**
   * Set number of points.
   */
  setPoints(points: number): void {
    this.points = Math.max(
      this.options.minPoints,
      Math.min(this.options.maxPoints, points)
    );
    this.onPreviewUpdate?.();
  }

  /**
   * Get inner radius ratio.
   */
  getInnerRadiusRatio(): number {
    return this.innerRadiusRatio;
  }

  /**
   * Set inner radius ratio.
   */
  setInnerRadiusRatio(ratio: number): void {
    this.innerRadiusRatio = Math.max(0.1, Math.min(0.9, ratio));
    this.onPreviewUpdate?.();
  }

  /**
   * Check if currently drawing.
   */
  isDrawing(): boolean {
    return this.startPoint !== null;
  }

  /**
   * Get current preview star.
   */
  getPreviewStar(): StarData | null {
    if (!this.startPoint || !this.currentPoint) return null;
    return this.calculateStar(this.startPoint, this.currentPoint);
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

    const star = this.calculateStar(this.startPoint, this.currentPoint);

    // Check minimum size
    const minSize = this.options.minSize / context.viewport.getZoom();
    if (star.outerRadius >= minSize / 2) {
      if (this.onStarComplete) {
        this.createdNodeId = this.onStarComplete(star);
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

    // Adjust points with arrow keys
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      this.setPoints(this.points + 1);
      return true;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      this.setPoints(this.points - 1);
      return true;
    }

    // Number keys for quick point selection
    const num = parseInt(event.key, 10);
    if (num >= 3 && num <= 9) {
      this.setPoints(num);
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
    const star = this.getPreviewStar();
    if (!star) return;

    const viewport = context.viewport;

    ctx.save();

    // Draw preview star
    ctx.beginPath();
    const vertices = star.vertices;
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
    ctx.arc(star.center.x, star.center.y, 3 / viewport.getZoom(), 0, Math.PI * 2);
    ctx.fillStyle = '#0066FF';
    ctx.fill();

    // Draw radius lines
    ctx.beginPath();
    ctx.moveTo(star.center.x, star.center.y);
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

    // Show points count and dimensions
    const infoY = star.bounds.y + star.bounds.height + fontSize * 1.5;
    ctx.fillText(
      `${this.points} points • r=${Math.round(star.outerRadius)}`,
      star.center.x,
      infoY
    );

    ctx.restore();
  }

  /**
   * Calculate star from start and end points.
   */
  private calculateStar(start: Point, end: Point): StarData {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let center: Point;
    let outerRadius: number;

    if (this.drawFromCenter) {
      // Draw from center
      center = start;
      outerRadius = distance;
    } else {
      // Draw from edge
      center = {
        x: start.x + dx / 2,
        y: start.y + dy / 2,
      };
      outerRadius = distance / 2;
    }

    const innerRadius = outerRadius * this.innerRadiusRatio;

    // Calculate vertices (alternating outer and inner)
    const vertices: Point[] = [];
    const angleStep = Math.PI / this.points; // Half step for alternating

    for (let i = 0; i < this.points * 2; i++) {
      const angle = this.currentRotation + angleStep * i;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
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
      outerRadius,
      innerRadius,
      points: this.points,
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
   * Generate SVG path data for the star.
   */
  static generateSVGPath(star: StarData): string {
    if (star.vertices.length === 0) return '';

    const parts: string[] = [];
    const v = star.vertices;

    parts.push(`M ${v[0]!.x} ${v[0]!.y}`);
    for (let i = 1; i < v.length; i++) {
      parts.push(`L ${v[i]!.x} ${v[i]!.y}`);
    }
    parts.push('Z');

    return parts.join(' ');
  }
}

/**
 * Create a star tool.
 */
export function createStarTool(options?: StarToolOptions): StarTool {
  return new StarTool(options);
}
