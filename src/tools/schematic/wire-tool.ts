/**
 * Wire Tool
 *
 * Tool for drawing electrical wires in schematics.
 * Features:
 * - Orthogonal routing (horizontal/vertical segments)
 * - Auto-junction detection at intersections
 * - Snap to component pins
 * - Net assignment
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import {
  type WireSegment,
  type WireStyle,
  type Junction,
  DEFAULT_WIRE_STYLE,
  DEFAULT_JUNCTION_STYLE,
  createWireSegment,
  createJunction,
  pointsConnect,
  wireIntersection,
} from '@core/types/schematic';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Wire routing mode
 */
export type WireRoutingMode = 'orthogonal' | 'diagonal' | 'free';

/**
 * Wire tool options
 */
export interface WireToolOptions {
  /** Default wire style */
  readonly style?: Partial<WireStyle>;
  /** Routing mode */
  readonly routingMode?: WireRoutingMode;
  /** Snap tolerance in pixels */
  readonly snapTolerance?: number;
  /** Auto-create junctions */
  readonly autoJunction?: boolean;
  /** Grid snap size */
  readonly gridSnap?: number;
}

/**
 * Wire tool state
 */
type WireToolState = 'idle' | 'drawing';

/**
 * Wire creation result
 */
export interface WireCreationResult {
  /** Created wire segments */
  readonly wires: WireSegment[];
  /** Created junctions */
  readonly junctions: Junction[];
  /** Connected pin references */
  readonly connectedPins: Array<{ componentId: NodeId; pinId: string }>;
}

/**
 * Wire Tool for schematic capture
 */
export class WireTool extends BaseTool {
  readonly name = 'wire';
  cursor: ToolCursor = 'crosshair';

  private style: WireStyle;
  private routingMode: WireRoutingMode;
  private snapTolerance: number;
  private autoJunction: boolean;
  private gridSnap: number;

  private state: WireToolState = 'idle';
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private segments: Point[] = [];
  private previewSegments: Point[] = [];

  // Existing wires for junction detection
  private existingWires: WireSegment[] = [];

  // Callbacks
  private onWireCreate?: (result: WireCreationResult) => void;
  private onFindPinAtPoint?: (point: Point) => { componentId: NodeId; pinId: string; position: Point } | null;

  constructor(options: WireToolOptions = {}) {
    super();
    this.style = { ...DEFAULT_WIRE_STYLE, ...options.style };
    this.routingMode = options.routingMode ?? 'orthogonal';
    this.snapTolerance = options.snapTolerance ?? 10;
    this.autoJunction = options.autoJunction ?? true;
    this.gridSnap = options.gridSnap ?? 10;
  }

  /**
   * Set wire creation callback
   */
  setOnWireCreate(callback: (result: WireCreationResult) => void): void {
    this.onWireCreate = callback;
  }

  /**
   * Set pin finder callback
   */
  setOnFindPinAtPoint(callback: (point: Point) => { componentId: NodeId; pinId: string; position: Point } | null): void {
    this.onFindPinAtPoint = callback;
  }

  /**
   * Update existing wires for junction detection
   */
  setExistingWires(wires: WireSegment[]): void {
    this.existingWires = wires;
  }

  /**
   * Set wire style
   */
  setStyle(style: Partial<WireStyle>): void {
    this.style = { ...this.style, ...style };
  }

  /**
   * Set routing mode
   */
  setRoutingMode(mode: WireRoutingMode): void {
    this.routingMode = mode;
  }

  /**
   * Get current routing mode
   */
  getRoutingMode(): WireRoutingMode {
    return this.routingMode;
  }

  activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  deactivate(): void {
    super.deactivate();
    this.reset();
  }

  private reset(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.segments = [];
    this.previewSegments = [];
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    const worldPoint = this.snapToGrid({ x: event.worldX, y: event.worldY });
    const zoom = context.viewport.getZoom();

    // Try to snap to pin
    const pin = this.onFindPinAtPoint?.(worldPoint);
    const snappedPoint = pin?.position ?? this.snapToExistingWire(worldPoint, zoom) ?? worldPoint;

    if (this.state === 'idle') {
      // Start new wire
      this.startPoint = snappedPoint;
      this.segments = [snappedPoint];
      this.state = 'drawing';
      return true;
    } else if (this.state === 'drawing') {
      // Add point to wire path
      const routedPoints = this.routeToPoint(snappedPoint);
      this.segments.push(...routedPoints);

      // Check if we should end (double-click or on pin)
      if (pin) {
        this.finishWire();
      }

      return true;
    }

    return true;
  }

  onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    const worldPoint = this.snapToGrid({ x: event.worldX, y: event.worldY });
    const zoom = context.viewport.getZoom();

    // Try to snap to pin or existing wire
    const pin = this.onFindPinAtPoint?.(worldPoint);
    this.currentPoint = pin?.position ?? this.snapToExistingWire(worldPoint, zoom) ?? worldPoint;

    if (this.state === 'drawing' && this.segments.length > 0) {
      const lastPoint = this.segments[this.segments.length - 1]!;
      this.previewSegments = this.calculateRoutePoints(lastPoint, this.currentPoint);
    }
  }

  onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    super.onPointerUp(_event, _context);
    // Click handling done in onPointerDown
  }

  onDoubleClick(_event: PointerEventData, _context: ToolContext): boolean {
    if (this.state === 'drawing') {
      this.finishWire();
      return true;
    }
    return false;
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      if (this.state === 'drawing') {
        this.reset();
        return true;
      }
    } else if (event.key === 'Enter') {
      if (this.state === 'drawing') {
        this.finishWire();
        return true;
      }
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      if (this.state === 'drawing' && this.segments.length > 1) {
        this.segments.pop();
        return true;
      }
    } else if (event.key === ' ') {
      // Toggle routing mode
      this.toggleRoutingMode();
      return true;
    }

    return false;
  }

  getCursor(_point: Point, _context: ToolContext): ToolCursor {
    return 'crosshair';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    // Draw completed segments
    if (this.segments.length > 1) {
      ctx.strokeStyle = this.rgbaToString(this.style.color);
      ctx.lineWidth = this.style.width / zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(this.segments[0]!.x, this.segments[0]!.y);
      for (let i = 1; i < this.segments.length; i++) {
        ctx.lineTo(this.segments[i]!.x, this.segments[i]!.y);
      }
      ctx.stroke();
    }

    // Draw preview segments
    if (this.state === 'drawing' && this.previewSegments.length > 0) {
      ctx.strokeStyle = this.rgbaToString({ ...this.style.color, a: 0.5 });
      ctx.lineWidth = this.style.width / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);

      const lastSegmentPoint = this.segments[this.segments.length - 1]!;
      ctx.beginPath();
      ctx.moveTo(lastSegmentPoint.x, lastSegmentPoint.y);
      for (const point of this.previewSegments) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw start point indicator
    if (this.startPoint) {
      ctx.fillStyle = this.rgbaToString(this.style.color);
      ctx.beginPath();
      ctx.arc(this.startPoint.x, this.startPoint.y, 4 / zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw snap indicator at current point
    if (this.state === 'drawing' && this.currentPoint) {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 2 / zoom;
      const size = 6 / zoom;
      ctx.beginPath();
      ctx.moveTo(this.currentPoint.x - size, this.currentPoint.y);
      ctx.lineTo(this.currentPoint.x + size, this.currentPoint.y);
      ctx.moveTo(this.currentPoint.x, this.currentPoint.y - size);
      ctx.lineTo(this.currentPoint.x, this.currentPoint.y + size);
      ctx.stroke();
    }

    // Draw routing mode indicator
    this.renderModeIndicator(ctx, context, zoom);

    ctx.restore();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private toggleRoutingMode(): void {
    const modes: WireRoutingMode[] = ['orthogonal', 'diagonal', 'free'];
    const currentIndex = modes.indexOf(this.routingMode);
    this.routingMode = modes[(currentIndex + 1) % modes.length]!;
  }

  private snapToGrid(point: Point): Point {
    if (this.gridSnap <= 0) return point;
    return {
      x: Math.round(point.x / this.gridSnap) * this.gridSnap,
      y: Math.round(point.y / this.gridSnap) * this.gridSnap,
    };
  }

  private snapToExistingWire(point: Point, zoom: number): Point | null {
    const tolerance = this.snapTolerance / zoom;

    for (const wire of this.existingWires) {
      // Check endpoints
      if (pointsConnect(point, wire.start, tolerance)) {
        return wire.start;
      }
      if (pointsConnect(point, wire.end, tolerance)) {
        return wire.end;
      }
    }

    return null;
  }

  private routeToPoint(endPoint: Point): Point[] {
    if (this.segments.length === 0) return [endPoint];

    const lastPoint = this.segments[this.segments.length - 1]!;
    return this.calculateRoutePoints(lastPoint, endPoint);
  }

  private calculateRoutePoints(from: Point, to: Point): Point[] {
    if (this.routingMode === 'free') {
      return [to];
    }

    if (this.routingMode === 'diagonal') {
      // 45-degree routing
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy) {
        // Horizontal then diagonal
        const diagLength = absDy;
        const horizLength = absDx - diagLength;
        const midX = from.x + Math.sign(dx) * horizLength;
        return [
          { x: midX, y: from.y },
          to,
        ];
      } else {
        // Vertical then diagonal
        const diagLength = absDx;
        const vertLength = absDy - diagLength;
        const midY = from.y + Math.sign(dy) * vertLength;
        return [
          { x: from.x, y: midY },
          to,
        ];
      }
    }

    // Orthogonal routing (default)
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Determine if we go horizontal-first or vertical-first based on distance
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal first
      return [
        { x: to.x, y: from.y },
        to,
      ];
    } else {
      // Vertical first
      return [
        { x: from.x, y: to.y },
        to,
      ];
    }
  }

  private finishWire(): void {
    if (this.segments.length < 2) {
      this.reset();
      return;
    }

    // Add preview segments to final path
    if (this.currentPoint && this.previewSegments.length > 0) {
      this.segments.push(...this.previewSegments);
    }

    // Create wire segments
    const wires: WireSegment[] = [];
    for (let i = 0; i < this.segments.length - 1; i++) {
      const wire = createWireSegment(
        this.segments[i]!,
        this.segments[i + 1]!,
        this.style
      );
      wires.push(wire);
    }

    // Find junctions with existing wires
    const junctions: Junction[] = [];
    if (this.autoJunction) {
      const junctionPoints = this.findJunctionPoints(wires);
      for (const point of junctionPoints) {
        junctions.push(createJunction(point, [], DEFAULT_JUNCTION_STYLE));
      }
    }

    // Find connected pins
    const connectedPins: Array<{ componentId: NodeId; pinId: string }> = [];
    const startPin = this.onFindPinAtPoint?.(this.segments[0]!);
    if (startPin) {
      connectedPins.push({ componentId: startPin.componentId, pinId: startPin.pinId });
    }
    const endPin = this.onFindPinAtPoint?.(this.segments[this.segments.length - 1]!);
    if (endPin && (!startPin || startPin.componentId !== endPin.componentId || startPin.pinId !== endPin.pinId)) {
      connectedPins.push({ componentId: endPin.componentId, pinId: endPin.pinId });
    }

    // Emit result
    this.onWireCreate?.({
      wires,
      junctions,
      connectedPins,
    });

    this.reset();
  }

  private findJunctionPoints(newWires: WireSegment[]): Point[] {
    const junctions: Point[] = [];
    const tolerance = 2;

    // Check intersections with existing wires
    for (const newWire of newWires) {
      for (const existingWire of this.existingWires) {
        const intersection = wireIntersection(newWire, existingWire);
        if (intersection) {
          // Don't add junction if it's at an endpoint
          const isEndpoint =
            pointsConnect(intersection, newWire.start, tolerance) ||
            pointsConnect(intersection, newWire.end, tolerance) ||
            pointsConnect(intersection, existingWire.start, tolerance) ||
            pointsConnect(intersection, existingWire.end, tolerance);

          if (!isEndpoint) {
            // Check if junction already exists
            const exists = junctions.some(j => pointsConnect(j, intersection, tolerance));
            if (!exists) {
              junctions.push(intersection);
            }
          }
        }
      }
    }

    // Check endpoints that connect to middle of existing wires
    for (const newWire of newWires) {
      for (const existingWire of this.existingWires) {
        // Check if new wire starts/ends on existing wire (not at endpoints)
        for (const point of [newWire.start, newWire.end]) {
          const isOnExisting =
            !pointsConnect(point, existingWire.start, tolerance) &&
            !pointsConnect(point, existingWire.end, tolerance) &&
            this.isPointOnSegment(point, existingWire.start, existingWire.end, tolerance * 2);

          if (isOnExisting) {
            const exists = junctions.some(j => pointsConnect(j, point, tolerance));
            if (!exists) {
              junctions.push(point);
            }
          }
        }
      }
    }

    return junctions;
  }

  private isPointOnSegment(point: Point, start: Point, end: Point, tolerance: number): boolean {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 1e-10) return pointsConnect(point, start, tolerance);

    const t = Math.max(0, Math.min(1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)
    ));

    const closest = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    return pointsConnect(point, closest, tolerance);
  }

  private renderModeIndicator(ctx: CanvasRenderingContext2D, context: ToolContext, zoom: number): void {
    const offset = context.viewport.getOffset();
    const canvasSize = context.viewport.getCanvasSize();
    const x = -offset.x + 10 / zoom;
    const y = -offset.y + canvasSize.height / zoom - 30 / zoom;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 100 / zoom, 20 / zoom);

    ctx.fillStyle = '#00CC00';
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Wire: ${this.routingMode}`, x + 5 / zoom, y + 10 / zoom);
  }

  private rgbaToString(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${color.a})`;
  }
}

/**
 * Create a wire tool instance
 */
export function createWireTool(options?: WireToolOptions): WireTool {
  return new WireTool(options);
}
