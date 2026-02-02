/**
 * Block Insertion Tool
 *
 * Interactive tool for placing block instances on the canvas.
 * Supports rotation, scaling, and attribute prompts.
 */

import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '@tools/base/tool';
import type {
  BlockDefinition,
  BlockInstance,
  BlockAttributeDefinition,
} from '@core/types/block';
import { createBlockInstance } from '@core/types/block';
import type { Point } from '@core/types/geometry';

// =============================================================================
// Types
// =============================================================================

/**
 * Tool options
 */
export interface BlockInsertionOptions {
  /** Initial rotation angle */
  rotation?: number;
  /** Initial scale */
  scale?: { x: number; y: number };
  /** Auto-prompt for attributes */
  promptAttributes?: boolean;
  /** Layer to insert on */
  layer?: string;
}

/**
 * Insertion state
 */
interface InsertionState {
  block: BlockDefinition;
  position: Point;
  rotation: number;
  scale: { x: number; y: number };
  attributeValues: Record<string, string>;
  attributeIndex: number;
  phase: 'position' | 'attributes' | 'complete';
}

// =============================================================================
// Block Insertion Tool
// =============================================================================

/**
 * Tool for inserting block instances
 */
export class BlockInsertionTool extends BaseTool {
  readonly name = 'block-insertion';
  override cursor: ToolCursor = 'crosshair';

  private currentBlock: BlockDefinition | null = null;
  private insertionState: InsertionState | null = null;
  private options: BlockInsertionOptions = {};
  private rotationStep = 15;

  // Callbacks
  private onInsert: ((instance: BlockInstance) => void) | null = null;
  private onPromptAttribute: ((attr: BlockAttributeDefinition, callback: (value: string) => void) => void) | null = null;

  /**
   * Set the block to insert
   */
  setBlock(block: BlockDefinition, options: BlockInsertionOptions = {}): void {
    this.currentBlock = block;
    this.options = options;
    this.insertionState = null;
  }

  /**
   * Set insert callback
   */
  setOnInsert(callback: (instance: BlockInstance) => void): void {
    this.onInsert = callback;
  }

  /**
   * Set attribute prompt callback
   */
  setOnPromptAttribute(
    callback: (attr: BlockAttributeDefinition, onValue: (value: string) => void) => void
  ): void {
    this.onPromptAttribute = callback;
  }

  /**
   * Get current rotation
   */
  getRotation(): number {
    return this.insertionState?.rotation ?? this.options.rotation ?? 0;
  }

  /**
   * Set rotation
   */
  setRotation(angle: number): void {
    if (this.insertionState) {
      this.insertionState.rotation = angle % 360;
    }
  }

  /**
   * Rotate by increment
   */
  rotate(degrees: number): void {
    if (this.insertionState) {
      this.insertionState.rotation = (this.insertionState.rotation + degrees) % 360;
    }
  }

  /**
   * Get current scale
   */
  getScale(): { x: number; y: number } {
    return this.insertionState?.scale ?? this.options.scale ?? { x: 1, y: 1 };
  }

  /**
   * Set scale
   */
  setScale(scale: { x: number; y: number }): void {
    if (this.insertionState) {
      this.insertionState.scale = scale;
    }
  }

  // ===========================================================================
  // Tool Lifecycle
  // ===========================================================================

  override activate(context: ToolContext): void {
    super.activate(context);
    if (!this.currentBlock) {
      console.warn('BlockInsertionTool activated without a block');
    }
  }

  override deactivate(): void {
    super.deactivate();
    this.insertionState = null;
  }

  // ===========================================================================
  // Mouse Handling
  // ===========================================================================

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    if (!this.currentBlock) return false;

    // Start insertion
    if (!this.insertionState) {
      this.insertionState = {
        block: this.currentBlock,
        position: { x: event.worldX, y: event.worldY },
        rotation: this.options.rotation ?? 0,
        scale: this.options.scale ?? { x: 1, y: 1 },
        attributeValues: {},
        attributeIndex: 0,
        phase: 'position',
      };

      // Initialize attribute values with defaults
      for (const attr of this.currentBlock.attributes) {
        this.insertionState.attributeValues[attr.tag] = attr.defaultValue;
      }
    }

    return true;
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    if (!this.insertionState || this.insertionState.phase !== 'position') {
      return;
    }

    // Update position preview
    let worldX = event.worldX;
    let worldY = event.worldY;

    // Snap to grid if snap context available
    if (context.snapContext?.isEnabled()) {
      const snap = context.snapContext.findSnapPoint(worldX, worldY);
      if (snap) {
        worldX = snap.x;
        worldY = snap.y;
      }
    }

    this.insertionState.position = { x: worldX, y: worldY };
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    super.onPointerUp(event, context);

    if (!this.insertionState) return;

    if (this.insertionState.phase === 'position') {
      // Check if we need to prompt for attributes
      const editableAttrs = this.currentBlock!.attributes.filter(
        a => !a.constant && a.visible
      );

      if (this.options.promptAttributes && editableAttrs.length > 0) {
        // Start attribute prompting
        this.insertionState.phase = 'attributes';
        this.promptNextAttribute(context);
        return;
      }

      // Complete insertion
      this.completeInsertion();
    }
  }

  // ===========================================================================
  // Keyboard Handling
  // ===========================================================================

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (!this.insertionState) return false;

    switch (event.key) {
      case 'r':
      case 'R':
        // Rotate clockwise
        this.rotate(event.shiftKey ? 90 : this.rotationStep);
        return true;

      case 'e':
      case 'E':
        // Rotate counter-clockwise
        this.rotate(event.shiftKey ? -90 : -this.rotationStep);
        return true;

      case 'x':
      case 'X':
        // Flip horizontally
        if (this.insertionState) {
          this.insertionState.scale.x *= -1;
        }
        return true;

      case 'y':
      case 'Y':
        // Flip vertically
        if (this.insertionState) {
          this.insertionState.scale.y *= -1;
        }
        return true;

      case 'Escape':
        // Cancel insertion
        this.insertionState = null;
        return true;

      case 'Enter':
        // Confirm position
        if (this.insertionState.phase === 'position') {
          this.completeInsertion();
        }
        return true;

      default:
        return false;
    }
  }

  // ===========================================================================
  // Attribute Prompting
  // ===========================================================================

  /**
   * Prompt for the next attribute
   */
  private promptNextAttribute(context: ToolContext): void {
    if (!this.insertionState || !this.currentBlock) return;

    const editableAttrs = this.currentBlock.attributes.filter(
      a => !a.constant && a.visible
    );

    if (this.insertionState.attributeIndex >= editableAttrs.length) {
      this.completeInsertion();
      return;
    }

    const attr = editableAttrs[this.insertionState.attributeIndex]!;

    if (this.onPromptAttribute) {
      this.onPromptAttribute(attr, (value) => {
        this.insertionState!.attributeValues[attr.tag] = value || attr.defaultValue;
        this.insertionState!.attributeIndex++;
        this.promptNextAttribute(context);
      });
    } else {
      this.insertionState.attributeIndex++;
      this.promptNextAttribute(context);
    }
  }

  // ===========================================================================
  // Insertion Completion
  // ===========================================================================

  /**
   * Complete the block insertion
   */
  private completeInsertion(): void {
    if (!this.insertionState || !this.currentBlock) return;

    const instanceOptions: {
      name: string;
      scale: { x: number; y: number };
      rotation: number;
      attributeValues: Record<string, string>;
      layer?: string;
    } = {
      name: this.currentBlock.name,
      scale: this.insertionState.scale,
      rotation: this.insertionState.rotation,
      attributeValues: this.insertionState.attributeValues,
    };

    if (this.options.layer !== undefined) {
      instanceOptions.layer = this.options.layer;
    }

    const instance = createBlockInstance(
      this.currentBlock.id,
      this.insertionState.position,
      instanceOptions
    );

    // Notify callback
    if (this.onInsert) {
      this.onInsert(instance);
    }

    // Reset for next insertion
    this.insertionState = {
      block: this.currentBlock,
      position: this.insertionState.position,
      rotation: this.insertionState.rotation,
      scale: this.insertionState.scale,
      attributeValues: {},
      attributeIndex: 0,
      phase: 'position',
    };

    // Re-initialize attribute defaults
    for (const attr of this.currentBlock.attributes) {
      this.insertionState.attributeValues[attr.tag] = attr.defaultValue;
    }
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.insertionState || !this.currentBlock) return;

    const { position, rotation, scale } = this.insertionState;

    ctx.save();

    // Transform to insertion point
    ctx.translate(position.x, position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale.x, scale.y);

    // Draw block preview
    this.renderBlockPreview(ctx, this.currentBlock);

    ctx.restore();

    // Draw base point marker
    this.renderBasePointMarker(ctx, position);

    // Draw info overlay
    this.renderInfoOverlay(ctx, context);
  }

  /**
   * Render block geometry preview
   */
  private renderBlockPreview(ctx: CanvasRenderingContext2D, block: BlockDefinition): void {
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (const node of block.geometry) {
      this.renderNodePreview(ctx, node);
    }

    ctx.setLineDash([]);
  }

  /**
   * Render a single node preview
   */
  private renderNodePreview(ctx: CanvasRenderingContext2D, node: unknown): void {
    const n = node as Record<string, unknown>;

    switch (n['type']) {
      case 'RECTANGLE':
      case 'FRAME': {
        const x = (n['x'] as number) ?? 0;
        const y = (n['y'] as number) ?? 0;
        const w = (n['width'] as number) ?? 10;
        const h = (n['height'] as number) ?? 10;
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);
        break;
      }

      case 'ELLIPSE': {
        const cx = (n['x'] as number) ?? 0;
        const cy = (n['y'] as number) ?? 0;
        const rx = ((n['width'] as number) ?? 10) / 2;
        const ry = ((n['height'] as number) ?? 10) / 2;
        ctx.beginPath();
        ctx.ellipse(cx + rx, cy + ry, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        break;
      }

      case 'LINE': {
        const x1 = (n['x1'] as number) ?? 0;
        const y1 = (n['y1'] as number) ?? 0;
        const x2 = (n['x2'] as number) ?? 10;
        const y2 = (n['y2'] as number) ?? 0;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
      }

      case 'TEXT': {
        const x = (n['x'] as number) ?? 0;
        const y = (n['y'] as number) ?? 0;
        const text = (n['characters'] as string) ?? '';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.fillText(text, x, y);
        break;
      }
    }
  }

  /**
   * Render base point marker
   */
  private renderBasePointMarker(ctx: CanvasRenderingContext2D, position: Point): void {
    const size = 8;

    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Cross marker
    ctx.beginPath();
    ctx.moveTo(position.x - size, position.y);
    ctx.lineTo(position.x + size, position.y);
    ctx.moveTo(position.x, position.y - size);
    ctx.lineTo(position.x, position.y + size);
    ctx.stroke();

    // Circle
    ctx.beginPath();
    ctx.arc(position.x, position.y, size * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Render info overlay
   */
  private renderInfoOverlay(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.insertionState) return;

    const { position, rotation, scale } = this.insertionState;
    const screenPos = context.viewport.worldToCanvas(position.x, position.y);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = '11px Inter, sans-serif';

    const lines = [
      `Block: ${this.currentBlock!.name}`,
      `Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`,
      `Rotation: ${rotation}°`,
      `Scale: ${scale.x.toFixed(2)} x ${scale.y.toFixed(2)}`,
      '',
      'R/E: Rotate  |  X/Y: Flip',
      'Enter: Insert  |  Esc: Cancel',
    ];

    const padding = 8;
    const lineHeight = 16;
    const boxWidth = 200;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const boxX = screenPos.x + 20;
    const boxY = screenPos.y + 20;

    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 1;
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
 * Create a block insertion tool
 */
export function createBlockInsertionTool(): BlockInsertionTool {
  return new BlockInsertionTool();
}
