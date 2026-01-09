/**
 * PCB Via Placement Tool
 *
 * Interactive tool for placing vias on PCB boards.
 * Supports through-hole, blind, buried, and micro vias.
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
import type { PCBVia, ViaType } from '@core/types/pcb';

// =============================================================================
// Types
// =============================================================================

/**
 * Via size preset
 */
export interface ViaSizePreset {
  readonly name: string;
  readonly drill: number;
  readonly diameter: number;
}

/**
 * Tool options
 */
export interface ViaToolOptions {
  /** Default via type */
  readonly defaultType?: ViaType;
  /** Default drill diameter in mm */
  readonly defaultDrill?: number;
  /** Default pad diameter in mm */
  readonly defaultDiameter?: number;
  /** Default start layer */
  readonly startLayer?: string;
  /** Default end layer */
  readonly endLayer?: string;
  /** Whether vias are tented by default */
  readonly defaultTented?: boolean;
  /** Grid snap size */
  readonly gridSize?: number;
  /** Via size presets */
  readonly presets?: ViaSizePreset[];
}

const DEFAULT_PRESETS: ViaSizePreset[] = [
  { name: 'Small', drill: 0.3, diameter: 0.6 },
  { name: 'Medium', drill: 0.4, diameter: 0.8 },
  { name: 'Large', drill: 0.6, diameter: 1.0 },
  { name: 'Power', drill: 0.8, diameter: 1.4 },
];

const DEFAULT_OPTIONS: Required<ViaToolOptions> = {
  defaultType: 'through',
  defaultDrill: 0.3,
  defaultDiameter: 0.6,
  startLayer: 'F.Cu',
  endLayer: 'B.Cu',
  defaultTented: false,
  gridSize: 0.25,
  presets: DEFAULT_PRESETS,
};

// =============================================================================
// Via Tool
// =============================================================================

/**
 * Tool for placing PCB vias
 */
export class ViaTool extends BaseTool {
  readonly name = 'via';
  override cursor: ToolCursor = 'crosshair';

  private options: Required<ViaToolOptions>;
  private currentType: ViaType;
  private currentDrill: number;
  private currentDiameter: number;
  private currentStartLayer: string;
  private currentEndLayer: string;
  private currentTented: boolean;
  private previewPosition: Point | null = null;
  private presetIndex: number = 0;

  // Available layers
  private availableLayers: string[] = ['F.Cu', 'B.Cu'];

  // Net assignment (optional)
  private currentNet: string = '';

  // Callbacks
  private onViaPlace: ((via: PCBVia) => void) | null = null;
  private onPreviewUpdate: (() => void) | null = null;

  constructor(options: ViaToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentType = this.options.defaultType;
    this.currentDrill = this.options.defaultDrill;
    this.currentDiameter = this.options.defaultDiameter;
    this.currentStartLayer = this.options.startLayer;
    this.currentEndLayer = this.options.endLayer;
    this.currentTented = this.options.defaultTented;
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Set via place callback
   */
  setOnViaPlace(callback: (via: PCBVia) => void): void {
    this.onViaPlace = callback;
  }

  /**
   * Set preview update callback
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set available copper layers
   */
  setAvailableLayers(layers: string[]): void {
    this.availableLayers = layers;
  }

  /**
   * Set current net for via assignment
   */
  setCurrentNet(net: string): void {
    this.currentNet = net;
  }

  /**
   * Get current net
   */
  getCurrentNet(): string {
    return this.currentNet;
  }

  /**
   * Set via type
   */
  setViaType(type: ViaType): void {
    this.currentType = type;
    this.onPreviewUpdate?.();
  }

  /**
   * Get current via type
   */
  getViaType(): ViaType {
    return this.currentType;
  }

  /**
   * Set drill diameter
   */
  setDrill(drill: number): void {
    this.currentDrill = Math.max(0.1, drill);
    // Ensure diameter is at least drill + 0.2mm
    if (this.currentDiameter < this.currentDrill + 0.2) {
      this.currentDiameter = this.currentDrill + 0.3;
    }
    this.onPreviewUpdate?.();
  }

  /**
   * Get current drill diameter
   */
  getDrill(): number {
    return this.currentDrill;
  }

  /**
   * Set pad diameter
   */
  setDiameter(diameter: number): void {
    // Ensure diameter is at least drill + 0.2mm
    this.currentDiameter = Math.max(this.currentDrill + 0.2, diameter);
    this.onPreviewUpdate?.();
  }

  /**
   * Get current pad diameter
   */
  getDiameter(): number {
    return this.currentDiameter;
  }

  /**
   * Set start layer
   */
  setStartLayer(layer: string): void {
    this.currentStartLayer = layer;
    this.onPreviewUpdate?.();
  }

  /**
   * Get start layer
   */
  getStartLayer(): string {
    return this.currentStartLayer;
  }

  /**
   * Set end layer
   */
  setEndLayer(layer: string): void {
    this.currentEndLayer = layer;
    this.onPreviewUpdate?.();
  }

  /**
   * Get end layer
   */
  getEndLayer(): string {
    return this.currentEndLayer;
  }

  /**
   * Set tented state
   */
  setTented(tented: boolean): void {
    this.currentTented = tented;
    this.onPreviewUpdate?.();
  }

  /**
   * Get tented state
   */
  isTented(): boolean {
    return this.currentTented;
  }

  /**
   * Apply a size preset
   */
  applyPreset(preset: ViaSizePreset): void {
    this.currentDrill = preset.drill;
    this.currentDiameter = preset.diameter;
    this.onPreviewUpdate?.();
  }

  /**
   * Get current size presets
   */
  getPresets(): ViaSizePreset[] {
    return this.options.presets;
  }

  // ===========================================================================
  // Tool Lifecycle
  // ===========================================================================

  override activate(context: ToolContext): void {
    super.activate(context);
    this.previewPosition = null;
  }

  override deactivate(): void {
    super.deactivate();
    this.previewPosition = null;
  }

  // ===========================================================================
  // Mouse Handling
  // ===========================================================================

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    if (event.button !== 0) return false;

    let worldX = event.worldX;
    let worldY = event.worldY;

    // Snap to grid
    if (context.snapContext?.isEnabled()) {
      const snap = context.snapContext.findSnapPoint(worldX, worldY);
      if (snap) {
        worldX = snap.x;
        worldY = snap.y;
      }
    } else {
      // Default grid snap
      const gridSize = this.options.gridSize;
      worldX = Math.round(worldX / gridSize) * gridSize;
      worldY = Math.round(worldY / gridSize) * gridSize;
    }

    this.previewPosition = { x: worldX, y: worldY };
    return true;
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    let worldX = event.worldX;
    let worldY = event.worldY;

    // Snap to grid
    if (context.snapContext?.isEnabled()) {
      const snap = context.snapContext.findSnapPoint(worldX, worldY);
      if (snap) {
        worldX = snap.x;
        worldY = snap.y;
      }
    } else {
      // Default grid snap
      const gridSize = this.options.gridSize;
      worldX = Math.round(worldX / gridSize) * gridSize;
      worldY = Math.round(worldY / gridSize) * gridSize;
    }

    this.previewPosition = { x: worldX, y: worldY };
    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    super.onPointerUp(event, context);

    if (event.button !== 0) return;
    if (!this.previewPosition) return;

    // Create and place via
    const via = this.createVia(this.previewPosition);
    this.onViaPlace?.(via);

    this.onPreviewUpdate?.();
  }

  // ===========================================================================
  // Keyboard Handling
  // ===========================================================================

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    switch (event.key) {
      case 'Escape':
        this.previewPosition = null;
        this.onPreviewUpdate?.();
        return true;

      case 't':
      case 'T':
        // Toggle tented
        this.currentTented = !this.currentTented;
        this.onPreviewUpdate?.();
        return true;

      case 'Tab':
        // Cycle through via types
        this.cycleViaType();
        return true;

      case 'v':
      case 'V':
        // Cycle through size presets
        this.cyclePreset();
        return true;

      case '+':
      case '=':
        // Increase size
        this.setDrill(this.currentDrill + 0.1);
        return true;

      case '-':
      case '_':
        // Decrease size
        this.setDrill(this.currentDrill - 0.1);
        return true;

      case 'PageUp':
        // Switch start layer
        this.cycleLayer('start', 1);
        return true;

      case 'PageDown':
        // Switch end layer
        this.cycleLayer('end', 1);
        return true;

      default:
        return false;
    }
  }

  // ===========================================================================
  // Via Creation
  // ===========================================================================

  /**
   * Create a via at the given position
   */
  private createVia(position: Point): PCBVia {
    const id = `via-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as NodeId;

    return {
      id,
      type: 'VIA',
      net: this.currentNet,
      viaType: this.currentType,
      position: { ...position },
      drill: this.currentDrill,
      diameter: this.currentDiameter,
      startLayer: this.currentStartLayer,
      endLayer: this.currentEndLayer,
      tented: this.currentTented,
      locked: false,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Cycle through via types
   */
  private cycleViaType(): void {
    const types: ViaType[] = ['through', 'blind', 'buried', 'micro'];
    const currentIndex = types.indexOf(this.currentType);
    this.currentType = types[(currentIndex + 1) % types.length]!;
    this.onPreviewUpdate?.();
  }

  /**
   * Cycle through size presets
   */
  private cyclePreset(): void {
    const presets = this.options.presets;
    this.presetIndex = (this.presetIndex + 1) % presets.length;
    this.applyPreset(presets[this.presetIndex]!);
  }

  /**
   * Cycle layer for start or end
   */
  private cycleLayer(which: 'start' | 'end', direction: 1 | -1): void {
    const currentLayer = which === 'start' ? this.currentStartLayer : this.currentEndLayer;
    const copperLayers = this.availableLayers.filter(l => l.endsWith('.Cu'));

    if (copperLayers.length === 0) return;

    const currentIndex = copperLayers.indexOf(currentLayer);
    const newIndex = (currentIndex + direction + copperLayers.length) % copperLayers.length;
    const newLayer = copperLayers[newIndex]!;

    if (which === 'start') {
      this.currentStartLayer = newLayer;
    } else {
      this.currentEndLayer = newLayer;
    }

    this.onPreviewUpdate?.();
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.previewPosition) return;

    ctx.save();

    const { x, y } = this.previewPosition;
    const outerRadius = this.currentDiameter / 2;
    const innerRadius = this.currentDrill / 2;

    // Draw via pad (outer circle)
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);

    // Color based on via type
    const color = this.getViaColor();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.05;
    ctx.stroke();

    // Draw drill hole (inner circle)
    ctx.beginPath();
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // Draw tented indicator (X pattern if tented)
    if (this.currentTented) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(x - outerRadius * 0.7, y - outerRadius * 0.7);
      ctx.lineTo(x + outerRadius * 0.7, y + outerRadius * 0.7);
      ctx.moveTo(x + outerRadius * 0.7, y - outerRadius * 0.7);
      ctx.lineTo(x - outerRadius * 0.7, y + outerRadius * 0.7);
      ctx.stroke();
    }

    ctx.restore();

    // Draw info overlay
    this.renderInfoOverlay(ctx, context);
  }

  /**
   * Get color based on via type
   */
  private getViaColor(): string {
    switch (this.currentType) {
      case 'through':
        return 'rgba(200, 200, 200, 0.8)';
      case 'blind':
        return 'rgba(100, 200, 100, 0.8)';
      case 'buried':
        return 'rgba(200, 100, 100, 0.8)';
      case 'micro':
        return 'rgba(100, 100, 200, 0.8)';
      default:
        return 'rgba(200, 200, 200, 0.8)';
    }
  }

  /**
   * Render info overlay
   */
  private renderInfoOverlay(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.previewPosition) return;

    const screenPos = context.viewport.worldToCanvas(
      this.previewPosition.x,
      this.previewPosition.y
    );

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = '11px Inter, sans-serif';

    const typeNames: Record<ViaType, string> = {
      through: 'Through',
      blind: 'Blind',
      buried: 'Buried',
      micro: 'Micro',
    };

    const currentPreset = this.options.presets[this.presetIndex];
    const lines = [
      `Type: ${typeNames[this.currentType]}`,
      `Drill: ${this.currentDrill.toFixed(2)}mm`,
      `Pad: ${this.currentDiameter.toFixed(2)}mm`,
      `Layers: ${this.currentStartLayer} → ${this.currentEndLayer}`,
      `Tented: ${this.currentTented ? 'Yes' : 'No'}`,
      `Preset: ${currentPreset?.name ?? 'Custom'}`,
      '',
      'Tab: Type | V: Size | T: Tent',
      '+/-: Drill | PgUp/Dn: Layer',
    ];

    const padding = 8;
    const lineHeight = 16;
    const boxWidth = 200;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const boxX = screenPos.x + 20;
    const boxY = screenPos.y + 20;

    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = this.getViaColor();
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, boxX + padding, boxY + padding + (i + 1) * lineHeight - 4);
    }

    ctx.restore();
  }

  /**
   * Get current via info for external use
   */
  getViaInfo(): {
    type: ViaType;
    drill: number;
    diameter: number;
    startLayer: string;
    endLayer: string;
    tented: boolean;
    position: Point | null;
  } {
    return {
      type: this.currentType,
      drill: this.currentDrill,
      diameter: this.currentDiameter,
      startLayer: this.currentStartLayer,
      endLayer: this.currentEndLayer,
      tented: this.currentTented,
      position: this.previewPosition,
    };
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a via tool instance
 */
export function createViaTool(options?: ViaToolOptions): ViaTool {
  return new ViaTool(options);
}
