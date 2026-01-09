/**
 * PCB Track Routing Tool
 *
 * Interactive tool for routing copper tracks on PCB boards.
 * Supports 45° routing, via insertion, and layer switching.
 */

import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '@tools/base/tool';
import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import type { PCBTrack, PCBVia, TrackSegment } from '@core/types/pcb';

// =============================================================================
// Types
// =============================================================================

/**
 * Routing mode
 */
export type RoutingMode = 'orthogonal' | '45degree' | 'any_angle';

/**
 * Route segment during creation
 */
interface RouteSegment {
  start: Point;
  end: Point;
}

/**
 * Routing state
 */
interface RoutingState {
  segments: RouteSegment[];
  currentStart: Point;
  currentEnd: Point;
  layer: string;
  width: number;
  net?: string;
}

/**
 * Tool options
 */
export interface TrackRoutingToolOptions {
  defaultWidth?: number;
  defaultLayer?: string;
  routingMode?: RoutingMode;
  autoViaOnLayerChange?: boolean;
}

// =============================================================================
// Track Routing Tool
// =============================================================================

/**
 * Tool for routing PCB tracks
 */
export class TrackRoutingTool extends BaseTool {
  readonly name = 'track-routing';
  override cursor: ToolCursor = 'crosshair';

  private routingState: RoutingState | null = null;
  private routingMode: RoutingMode = '45degree';
  private defaultWidth: number = 0.25;
  private defaultLayer: string = 'F.Cu';
  private autoViaOnLayerChange: boolean = true;

  // Available layers
  private availableLayers: string[] = ['F.Cu', 'B.Cu'];

  // Callbacks
  private onTrackComplete: ((track: PCBTrack) => void) | null = null;
  private onViaInsert: ((via: PCBVia) => void) | null = null;

  /**
   * Configure tool options
   */
  configure(options: TrackRoutingToolOptions): void {
    if (options.defaultWidth !== undefined) {
      this.defaultWidth = options.defaultWidth;
    }
    if (options.defaultLayer !== undefined) {
      this.defaultLayer = options.defaultLayer;
    }
    if (options.routingMode !== undefined) {
      this.routingMode = options.routingMode;
    }
    if (options.autoViaOnLayerChange !== undefined) {
      this.autoViaOnLayerChange = options.autoViaOnLayerChange;
    }
  }

  /**
   * Set available layers
   */
  setAvailableLayers(layers: string[]): void {
    this.availableLayers = layers;
  }

  /**
   * Set track complete callback
   */
  setOnTrackComplete(callback: (track: PCBTrack) => void): void {
    this.onTrackComplete = callback;
  }

  /**
   * Set via insert callback
   */
  setOnViaInsert(callback: (via: PCBVia) => void): void {
    this.onViaInsert = callback;
  }

  /**
   * Get current layer
   */
  getCurrentLayer(): string {
    return this.routingState?.layer ?? this.defaultLayer;
  }

  /**
   * Set current layer
   */
  setCurrentLayer(layer: string): void {
    if (this.routingState) {
      const previousLayer = this.routingState.layer;
      this.routingState.layer = layer;

      // Insert via if changing layer while routing
      if (this.autoViaOnLayerChange && previousLayer !== layer && this.onViaInsert) {
        const via: PCBVia = {
          id: `via-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as NodeId,
          type: 'VIA',
          net: this.routingState.net ?? '',
          viaType: 'through',
          position: this.routingState.currentStart,
          drill: 0.3,
          diameter: 0.6,
          startLayer: previousLayer,
          endLayer: layer,
          tented: false,
          locked: false,
        };
        this.onViaInsert(via);
      }
    } else {
      this.defaultLayer = layer;
    }
  }

  /**
   * Get current track width
   */
  getTrackWidth(): number {
    return this.routingState?.width ?? this.defaultWidth;
  }

  /**
   * Set track width
   */
  setTrackWidth(width: number): void {
    if (this.routingState) {
      this.routingState.width = width;
    }
    this.defaultWidth = width;
  }

  /**
   * Get routing mode
   */
  getRoutingMode(): RoutingMode {
    return this.routingMode;
  }

  /**
   * Set routing mode
   */
  setRoutingMode(mode: RoutingMode): void {
    this.routingMode = mode;
  }

  /**
   * Start routing from a net (for auto-connect)
   */
  startFromNet(startPoint: Point, net: string): void {
    this.routingState = {
      segments: [],
      currentStart: startPoint,
      currentEnd: startPoint,
      layer: this.defaultLayer,
      width: this.defaultWidth,
      net,
    };
  }

  // ===========================================================================
  // Tool Lifecycle
  // ===========================================================================

  override activate(context: ToolContext): void {
    super.activate(context);
    this.routingState = null;
  }

  override deactivate(): void {
    super.deactivate();
    this.routingState = null;
  }

  // ===========================================================================
  // Mouse Handling
  // ===========================================================================

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    let worldX = event.worldX;
    let worldY = event.worldY;

    // Snap to grid
    if (context.snapContext?.isEnabled()) {
      const snap = context.snapContext.findSnapPoint(worldX, worldY);
      if (snap) {
        worldX = snap.x;
        worldY = snap.y;
      }
    }

    const point = { x: worldX, y: worldY };

    if (!this.routingState) {
      // Start new route
      this.routingState = {
        segments: [],
        currentStart: point,
        currentEnd: point,
        layer: this.defaultLayer,
        width: this.defaultWidth,
      };
    } else {
      // Add segment and continue routing
      const processedEnd = this.processRouteEnd(
        this.routingState.currentStart,
        point
      );

      if (
        processedEnd.x !== this.routingState.currentStart.x ||
        processedEnd.y !== this.routingState.currentStart.y
      ) {
        this.routingState.segments.push({
          start: this.routingState.currentStart,
          end: processedEnd,
        });
        this.routingState.currentStart = processedEnd;
      }
    }

    return true;
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    if (!this.routingState) return;

    let worldX = event.worldX;
    let worldY = event.worldY;

    // Snap to grid
    if (context.snapContext?.isEnabled()) {
      const snap = context.snapContext.findSnapPoint(worldX, worldY);
      if (snap) {
        worldX = snap.x;
        worldY = snap.y;
      }
    }

    this.routingState.currentEnd = { x: worldX, y: worldY };
  }

  override onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    // Routing continues on click, not release
  }

  // ===========================================================================
  // Keyboard Handling
  // ===========================================================================

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    switch (event.key) {
      case 'Escape':
        // Cancel current routing
        this.routingState = null;
        return true;

      case 'Enter':
        // Complete route
        this.completeRoute();
        return true;

      case 'Backspace':
      case 'Delete':
        // Remove last segment
        if (this.routingState && this.routingState.segments.length > 0) {
          const lastSeg = this.routingState.segments.pop();
          if (lastSeg) {
            this.routingState.currentStart = lastSeg.start;
          }
        }
        return true;

      case '/':
        // Cycle routing mode
        this.cycleRoutingMode();
        return true;

      case 'v':
      case 'V':
        // Insert via and switch layer
        if (this.routingState) {
          this.insertViaAndSwitchLayer();
        }
        return true;

      case 'w':
      case 'W':
        // Cycle track width
        this.cycleTrackWidth();
        return true;

      case '+':
      case '=':
        // Increase track width
        this.setTrackWidth(this.getTrackWidth() + 0.05);
        return true;

      case '-':
      case '_':
        // Decrease track width
        this.setTrackWidth(Math.max(0.1, this.getTrackWidth() - 0.05));
        return true;

      case 'PageUp':
        // Switch to next layer
        this.cycleLayer(1);
        return true;

      case 'PageDown':
        // Switch to previous layer
        this.cycleLayer(-1);
        return true;

      default:
        return false;
    }
  }

  // ===========================================================================
  // Route Processing
  // ===========================================================================

  /**
   * Process route endpoint based on routing mode
   */
  private processRouteEnd(start: Point, end: Point): Point {
    switch (this.routingMode) {
      case 'orthogonal':
        return this.processOrthogonal(start, end);
      case '45degree':
        return this.process45Degree(start, end);
      case 'any_angle':
      default:
        return end;
    }
  }

  /**
   * Process orthogonal routing (90° only)
   */
  private processOrthogonal(start: Point, end: Point): Point {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    // Route along dominant axis
    if (dx > dy) {
      return { x: end.x, y: start.y };
    } else {
      return { x: start.x, y: end.y };
    }
  }

  /**
   * Process 45° routing
   */
  private process45Degree(start: Point, end: Point): Point {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Determine if we should do horizontal-first or vertical-first
    // Then add a 45° segment

    if (adx > ady) {
      // Horizontal dominant - go horizontal then 45°
      const diag = ady;
      const horiz = adx - diag;

      return {
        x: start.x + Math.sign(dx) * horiz + Math.sign(dx) * diag,
        y: start.y + Math.sign(dy) * diag,
      };
    } else {
      // Vertical dominant - go vertical then 45°
      const diag = adx;
      const vert = ady - diag;

      return {
        x: start.x + Math.sign(dx) * diag,
        y: start.y + Math.sign(dy) * vert + Math.sign(dy) * diag,
      };
    }
  }

  /**
   * Get intermediate segments for 45° routing
   */
  private get45DegreeSegments(start: Point, end: Point): RouteSegment[] {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < 0.001 && ady < 0.001) {
      return [];
    }

    // Already at 45° or orthogonal
    const angle = Math.atan2(ady, adx) * (180 / Math.PI);
    if (angle < 1 || Math.abs(angle - 45) < 1 || Math.abs(angle - 90) < 1) {
      return [{ start, end }];
    }

    // Need intermediate point
    if (adx > ady) {
      // Horizontal then 45°
      const diag = ady;
      const horiz = adx - diag;
      const mid: Point = {
        x: start.x + Math.sign(dx) * horiz,
        y: start.y,
      };
      return [
        { start, end: mid },
        { start: mid, end },
      ];
    } else {
      // Vertical then 45°
      const diag = adx;
      const vert = ady - diag;
      const mid: Point = {
        x: start.x,
        y: start.y + Math.sign(dy) * vert,
      };
      return [
        { start, end: mid },
        { start: mid, end },
      ];
    }
  }

  // ===========================================================================
  // Route Completion
  // ===========================================================================

  /**
   * Complete the current route
   */
  private completeRoute(): void {
    if (!this.routingState) return;

    // Add final segment if different from start
    const finalEnd = this.processRouteEnd(
      this.routingState.currentStart,
      this.routingState.currentEnd
    );

    if (
      finalEnd.x !== this.routingState.currentStart.x ||
      finalEnd.y !== this.routingState.currentStart.y
    ) {
      // For 45° mode, might need intermediate segments
      if (this.routingMode === '45degree') {
        const segs = this.get45DegreeSegments(
          this.routingState.currentStart,
          finalEnd
        );
        this.routingState.segments.push(...segs);
      } else {
        this.routingState.segments.push({
          start: this.routingState.currentStart,
          end: finalEnd,
        });
      }
    }

    if (this.routingState.segments.length > 0 && this.onTrackComplete) {
      // Convert RouteSegments to TrackSegments
      const trackSegments: TrackSegment[] = this.routingState.segments.map(seg => ({
        type: 'line' as const,
        start: seg.start,
        end: seg.end,
      }));

      const track: PCBTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as NodeId,
        type: 'TRACK',
        net: this.routingState.net ?? '',
        layer: this.routingState.layer,
        width: this.routingState.width,
        segments: trackSegments,
        locked: false,
      };

      this.onTrackComplete(track);
    }

    this.routingState = null;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Cycle through routing modes
   */
  private cycleRoutingMode(): void {
    const modes: RoutingMode[] = ['45degree', 'orthogonal', 'any_angle'];
    const currentIndex = modes.indexOf(this.routingMode);
    this.routingMode = modes[(currentIndex + 1) % modes.length]!;
  }

  /**
   * Cycle through common track widths
   */
  private cycleTrackWidth(): void {
    const widths = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.8, 1.0];
    const current = this.getTrackWidth();

    // Find next width
    for (const w of widths) {
      if (w > current + 0.001) {
        this.setTrackWidth(w);
        return;
      }
    }

    // Wrap around
    this.setTrackWidth(widths[0]!);
  }

  /**
   * Cycle through available layers
   */
  private cycleLayer(direction: 1 | -1): void {
    const currentLayer = this.getCurrentLayer();
    const currentIndex = this.availableLayers.indexOf(currentLayer);

    if (currentIndex === -1) return;

    const newIndex =
      (currentIndex + direction + this.availableLayers.length) %
      this.availableLayers.length;

    this.setCurrentLayer(this.availableLayers[newIndex]!);
  }

  /**
   * Insert via and switch to opposite copper layer
   */
  private insertViaAndSwitchLayer(): void {
    if (!this.routingState) return;

    const currentLayer = this.routingState.layer;
    let targetLayer: string;

    // Determine target layer (simple top/bottom toggle)
    if (currentLayer.startsWith('F.')) {
      targetLayer = currentLayer.replace('F.', 'B.');
    } else if (currentLayer.startsWith('B.')) {
      targetLayer = currentLayer.replace('B.', 'F.');
    } else if (currentLayer.includes('In')) {
      // Inner layer - toggle to top
      targetLayer = 'F.Cu';
    } else {
      targetLayer = 'B.Cu';
    }

    // Insert via
    if (this.onViaInsert) {
      const via: PCBVia = {
        id: `via-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as NodeId,
        type: 'VIA',
        net: this.routingState.net ?? '',
        viaType: 'through',
        position: this.routingState.currentStart,
        drill: 0.3,
        diameter: 0.6,
        startLayer: currentLayer,
        endLayer: targetLayer,
        tented: false,
        locked: false,
      };
      this.onViaInsert(via);
    }

    this.routingState.layer = targetLayer;
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.routingState) return;

    ctx.save();

    // Layer color
    const layerColor = this.getLayerColor(this.routingState.layer);
    ctx.strokeStyle = layerColor;
    ctx.fillStyle = layerColor;
    ctx.lineWidth = this.routingState.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw completed segments
    for (const seg of this.routingState.segments) {
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();
    }

    // Draw current segment preview
    const previewEnd = this.processRouteEnd(
      this.routingState.currentStart,
      this.routingState.currentEnd
    );

    if (this.routingMode === '45degree') {
      // Draw with intermediate point
      const segs = this.get45DegreeSegments(
        this.routingState.currentStart,
        previewEnd
      );

      ctx.setLineDash([4, 4]);
      for (const seg of segs) {
        ctx.beginPath();
        ctx.moveTo(seg.start.x, seg.start.y);
        ctx.lineTo(seg.end.x, seg.end.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.routingState.currentStart.x, this.routingState.currentStart.y);
      ctx.lineTo(previewEnd.x, previewEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw vertex markers
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = layerColor;
    ctx.lineWidth = 1;

    // Start point
    if (this.routingState.segments.length === 0) {
      this.drawVertex(ctx, this.routingState.currentStart);
    }

    // Segment endpoints
    for (const seg of this.routingState.segments) {
      this.drawVertex(ctx, seg.end);
    }

    // Current endpoint
    this.drawVertex(ctx, previewEnd);

    ctx.restore();

    // Draw info overlay
    this.renderInfoOverlay(ctx, context);
  }

  /**
   * Draw a vertex marker
   */
  private drawVertex(ctx: CanvasRenderingContext2D, point: Point): void {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Get color for layer
   */
  private getLayerColor(layer: string): string {
    const colors: Record<string, string> = {
      'F.Cu': '#ff0000',
      'B.Cu': '#0000ff',
      'In1.Cu': '#00ff00',
      'In2.Cu': '#ffff00',
      'In3.Cu': '#ff00ff',
      'In4.Cu': '#00ffff',
    };
    return colors[layer] ?? '#888888';
  }

  /**
   * Render info overlay
   */
  private renderInfoOverlay(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.routingState) return;

    const { currentEnd, layer, width } = this.routingState;
    const screenPos = context.viewport.worldToCanvas(currentEnd.x, currentEnd.y);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = '11px Inter, sans-serif';

    const modeNames: Record<RoutingMode, string> = {
      orthogonal: '90°',
      '45degree': '45°',
      any_angle: 'Any',
    };

    const lines = [
      `Layer: ${layer}`,
      `Width: ${width.toFixed(2)}mm`,
      `Mode: ${modeNames[this.routingMode]}`,
      '',
      '/: Mode | V: Via | W: Width',
      'PgUp/Dn: Layer | Enter: Done',
    ];

    const padding = 8;
    const lineHeight = 16;
    const boxWidth = 180;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const boxX = screenPos.x + 20;
    const boxY = screenPos.y + 20;

    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = this.getLayerColor(layer);
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, boxX + padding, boxY + padding + (i + 1) * lineHeight - 4);
    }

    ctx.restore();
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a track routing tool
 */
export function createTrackRoutingTool(): TrackRoutingTool {
  return new TrackRoutingTool();
}
