/**
 * Net Label Tool
 *
 * Places net labels on wires to name signals/nets.
 * Supports:
 * - Local labels (same sheet)
 * - Global labels (all sheets)
 * - Hierarchical labels
 * - Power symbols (VCC, GND)
 * - Different label shapes (none, box, flag, diamond)
 */

import type { Point } from '@core/types/geometry';
import type {
  NetLabel,
  NetLabelType,
  NetLabelStyle,
  WireSegment,
} from '@core/types/schematic';
import { createNetLabel, pointOnWire, DEFAULT_NET_LABEL_STYLE } from '@core/types/schematic';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Net label tool options
 */
export interface NetLabelToolOptions {
  /** Default label type */
  readonly labelType?: NetLabelType;
  /** Default label text */
  readonly defaultText?: string;
  /** Default rotation (0, 90, 180, 270) */
  readonly rotation?: number;
  /** Grid snap size */
  readonly gridSize?: number;
  /** Label style */
  readonly style?: Partial<NetLabelStyle>;
}

const DEFAULT_OPTIONS: Required<NetLabelToolOptions> = {
  labelType: 'local',
  defaultText: 'NET',
  rotation: 0,
  gridSize: 10,
  style: {},
};

/**
 * Result of placing a net label
 */
export interface NetLabelPlaceResult {
  /** The created net label */
  readonly label: NetLabel;
  /** Wire ID if attached to wire */
  readonly attachedWireId?: string | undefined;
}

/**
 * Net label tool for placing signal/net labels
 */
export class NetLabelTool extends BaseTool {
  readonly name = 'netlabel';
  cursor: ToolCursor = 'crosshair';

  private options: Required<NetLabelToolOptions>;
  private previewPosition: Point | null = null;
  private currentText: string;
  private currentRotation: number;
  private currentType: NetLabelType;

  // External data
  private existingWires: WireSegment[] = [];

  // Callbacks
  private onLabelPlace?: (result: NetLabelPlaceResult) => void;
  private onPreviewUpdate?: () => void;
  private onPromptText?: (defaultText: string) => Promise<string | null>;

  constructor(options: NetLabelToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentText = this.options.defaultText;
    this.currentRotation = this.options.rotation;
    this.currentType = this.options.labelType;
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Set callback for when label is placed.
   */
  setOnLabelPlace(callback: (result: NetLabelPlaceResult) => void): void {
    this.onLabelPlace = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback to prompt user for label text.
   */
  setOnPromptText(callback: (defaultText: string) => Promise<string | null>): void {
    this.onPromptText = callback;
  }

  /**
   * Set existing wires for attachment detection.
   */
  setExistingWires(wires: WireSegment[]): void {
    this.existingWires = wires;
  }

  /**
   * Set the label type.
   */
  setLabelType(type: NetLabelType): void {
    this.currentType = type;
  }

  /**
   * Get the current label type.
   */
  getLabelType(): NetLabelType {
    return this.currentType;
  }

  /**
   * Set the label text.
   */
  setLabelText(text: string): void {
    this.currentText = text;
  }

  /**
   * Get the current label text.
   */
  getLabelText(): string {
    return this.currentText;
  }

  /**
   * Set rotation (0, 90, 180, 270).
   */
  setRotation(rotation: number): void {
    this.currentRotation = rotation % 360;
  }

  /**
   * Get current rotation.
   */
  getRotation(): number {
    return this.currentRotation;
  }

  // ===========================================================================
  // Tool Lifecycle
  // ===========================================================================

  override activate(_context: ToolContext): void {
    this.previewPosition = null;
  }

  override deactivate(): void {
    this.previewPosition = null;
  }

  // ===========================================================================
  // Pointer Events
  // ===========================================================================

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    if (event.button !== 0) return false;

    const position = this.snapToGrid(event.worldX, event.worldY);
    this.previewPosition = position;
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    const position = this.snapToGrid(event.worldX, event.worldY);
    this.previewPosition = position;
    this.onPreviewUpdate?.();
  }

  override async onPointerUp(event: PointerEventData, _context: ToolContext): Promise<void> {
    if (event.button !== 0) return;

    const position = this.snapToGrid(event.worldX, event.worldY);

    // Prompt for text if callback is set
    let text = this.currentText;
    if (this.onPromptText) {
      const result = await this.onPromptText(this.currentText);
      if (result === null) {
        // User cancelled
        return;
      }
      text = result;
      this.currentText = text;
    }

    // Create the label
    const label = createNetLabel(text, position, {
      type: this.currentType,
      rotation: this.currentRotation,
      style: { ...DEFAULT_NET_LABEL_STYLE, ...this.options.style },
    });

    // Find attached wire
    const attachedWireId = this.findWireAtPoint(position);

    // Emit result
    this.onLabelPlace?.({
      label,
      attachedWireId,
    });

    this.onPreviewUpdate?.();
  }

  // ===========================================================================
  // Keyboard Events
  // ===========================================================================

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    switch (event.key) {
      case 'r':
      case 'R':
        // Rotate 90 degrees
        this.currentRotation = (this.currentRotation + 90) % 360;
        this.onPreviewUpdate?.();
        return true;

      case 'Tab':
        // Cycle through label types
        this.cycleLabelType();
        this.onPreviewUpdate?.();
        return true;

      case 'Escape':
        this.previewPosition = null;
        this.onPreviewUpdate?.();
        return true;
    }
    return false;
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  /**
   * Render the preview label.
   */
  override render(ctx: CanvasRenderingContext2D): void {
    if (!this.previewPosition) return;

    ctx.save();
    ctx.translate(this.previewPosition.x, this.previewPosition.y);
    ctx.rotate((this.currentRotation * Math.PI) / 180);

    const style = { ...DEFAULT_NET_LABEL_STYLE, ...this.options.style };

    // Get shape for label type
    const shape = this.getShapeForType(this.currentType);

    // Draw background shape
    this.drawLabelShape(ctx, shape, style);

    // Draw text
    ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(${style.textColor.r * 255}, ${style.textColor.g * 255}, ${style.textColor.b * 255}, ${style.textColor.a})`;
    ctx.fillText(this.currentText, 0, 0);

    ctx.restore();

    // Draw attachment indicator if near wire
    const wireId = this.findWireAtPoint(this.previewPosition);
    if (wireId) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.previewPosition.x, this.previewPosition.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
      ctx.fill();
      ctx.restore();
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private snapToGrid(x: number, y: number): Point {
    const gridSize = this.options.gridSize;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }

  private findWireAtPoint(point: Point): string | undefined {
    for (const wire of this.existingWires) {
      if (pointOnWire(point, wire, 10)) {
        return wire.id;
      }
    }
    return undefined;
  }

  private cycleLabelType(): void {
    const types: NetLabelType[] = ['local', 'global', 'hierarchical', 'power'];
    const currentIndex = types.indexOf(this.currentType);
    this.currentType = types[(currentIndex + 1) % types.length]!;
  }

  private getShapeForType(type: NetLabelType): NetLabelStyle['shape'] {
    switch (type) {
      case 'local':
        return 'none';
      case 'global':
        return 'flag';
      case 'hierarchical':
        return 'box';
      case 'power':
        return 'none';
      default:
        return 'none';
    }
  }

  private drawLabelShape(
    ctx: CanvasRenderingContext2D,
    shape: NetLabelStyle['shape'],
    style: NetLabelStyle
  ): void {
    const textWidth = ctx.measureText(this.currentText).width;
    const padding = 4;
    const width = textWidth + padding * 2;
    const height = style.fontSize + padding * 2;

    switch (shape) {
      case 'box':
        ctx.strokeStyle = `rgba(${style.textColor.r * 255}, ${style.textColor.g * 255}, ${style.textColor.b * 255}, ${style.textColor.a})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        if (style.backgroundColor) {
          ctx.fillStyle = `rgba(${style.backgroundColor.r * 255}, ${style.backgroundColor.g * 255}, ${style.backgroundColor.b * 255}, ${style.backgroundColor.a})`;
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }
        break;

      case 'flag':
        ctx.beginPath();
        ctx.moveTo(-width / 2, -height / 2);
        ctx.lineTo(width / 2, -height / 2);
        ctx.lineTo(width / 2 + 8, 0);
        ctx.lineTo(width / 2, height / 2);
        ctx.lineTo(-width / 2, height / 2);
        ctx.closePath();
        ctx.strokeStyle = `rgba(${style.textColor.r * 255}, ${style.textColor.g * 255}, ${style.textColor.b * 255}, ${style.textColor.a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(-width / 2 - 4, 0);
        ctx.lineTo(0, -height / 2 - 4);
        ctx.lineTo(width / 2 + 4, 0);
        ctx.lineTo(0, height / 2 + 4);
        ctx.closePath();
        ctx.strokeStyle = `rgba(${style.textColor.r * 255}, ${style.textColor.g * 255}, ${style.textColor.b * 255}, ${style.textColor.a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;

      case 'none':
      default:
        // No shape, just underline for local labels
        if (this.currentType === 'local') {
          ctx.beginPath();
          ctx.moveTo(-width / 2, height / 2 - 2);
          ctx.lineTo(width / 2, height / 2 - 2);
          ctx.strokeStyle = `rgba(${style.textColor.r * 255}, ${style.textColor.g * 255}, ${style.textColor.b * 255}, ${style.textColor.a})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        break;
    }
  }

  /**
   * Get preview info for UI display.
   */
  getPreviewInfo(): {
    position: Point | null;
    text: string;
    type: NetLabelType;
    rotation: number;
    attachedToWire: boolean;
  } {
    const attachedToWire = this.previewPosition
      ? !!this.findWireAtPoint(this.previewPosition)
      : false;

    return {
      position: this.previewPosition,
      text: this.currentText,
      type: this.currentType,
      rotation: this.currentRotation,
      attachedToWire,
    };
  }
}
