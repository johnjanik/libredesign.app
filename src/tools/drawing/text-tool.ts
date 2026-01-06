/**
 * Text Tool
 *
 * Creates text nodes by clicking on the canvas.
 * Supports:
 * - Single click to create text at that position
 * - Click and drag to create text box with specific width
 */

import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '../base/tool';

/**
 * Text tool options
 */
export interface TextToolOptions {
  /** Default text content */
  readonly defaultText?: string;
  /** Default font size */
  readonly fontSize?: number;
  /** Default font family */
  readonly fontFamily?: string;
  /** Text color */
  readonly textColor?: { r: number; g: number; b: number; a: number };
  /** Minimum drag distance to create a sized text box (pixels) */
  readonly minDragSize?: number;
}

const DEFAULT_OPTIONS: Required<TextToolOptions> = {
  defaultText: 'Text',
  fontSize: 16,
  fontFamily: 'Inter',
  textColor: { r: 0, g: 0, b: 0, a: 1 },
  minDragSize: 10,
};

/**
 * Text tool for creating text nodes
 */
export class TextTool extends BaseTool {
  readonly name = 'text';
  cursor: ToolCursor = 'text';

  private options: Required<TextToolOptions>;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private isDragging = false;

  // Callbacks
  private onTextComplete?: (position: Point, width?: number) => NodeId | null;
  private onPreviewUpdate?: () => void;

  constructor(options: TextToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for when text is created.
   * @param callback - Called with position and optional width (if dragged)
   */
  setOnTextComplete(callback: (position: Point, width?: number) => NodeId | null): void {
    this.onTextComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Get default text content.
   */
  getDefaultText(): string {
    return this.options.defaultText;
  }

  /**
   * Get default font size.
   */
  getDefaultFontSize(): number {
    return this.options.fontSize;
  }

  /**
   * Get default font family.
   */
  getDefaultFontFamily(): string {
    return this.options.fontFamily;
  }

  /**
   * Get default text color.
   */
  getDefaultTextColor(): { r: number; g: number; b: number; a: number } {
    return this.options.textColor;
  }

  /**
   * Check if currently dragging.
   */
  isDrawing(): boolean {
    return this.startPoint !== null && this.isDragging;
  }

  /**
   * Get current preview rectangle (for drag-to-size).
   */
  getPreviewRect(): Rect | null {
    if (!this.startPoint || !this.currentPoint || !this.isDragging) return null;

    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const height = Math.abs(this.currentPoint.y - this.startPoint.y);

    return { x, y, width, height };
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
    this.isDragging = false;
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    if (!this.startPoint) return;

    this.currentPoint = { x: event.worldX, y: event.worldY };

    // Check if we've dragged far enough to consider it a drag operation
    const dx = this.currentPoint.x - this.startPoint.x;
    const dy = this.currentPoint.y - this.startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= this.options.minDragSize) {
      this.isDragging = true;
    }

    this.onPreviewUpdate?.();
  }

  override onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    if (!this.startPoint) return;

    if (this.isDragging && this.currentPoint) {
      // Create text box with specific width
      const width = Math.abs(this.currentPoint.x - this.startPoint.x);
      const x = Math.min(this.startPoint.x, this.currentPoint.x);
      const y = Math.min(this.startPoint.y, this.currentPoint.y);
      this.onTextComplete?.({ x, y }, width);
    } else {
      // Single click - create text at point
      this.onTextComplete?.(this.startPoint);
    }

    this.reset();
  }

  /**
   * Reset tool state.
   */
  private reset(): void {
    this.startPoint = null;
    this.currentPoint = null;
    this.isDragging = false;
  }
}

/**
 * Create a text tool instance.
 */
export function createTextTool(options?: TextToolOptions): TextTool {
  return new TextTool(options);
}
