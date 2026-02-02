/**
 * Text Edit Tool
 *
 * Handles text editing within text nodes.
 * Supports cursor positioning, selection, and keyboard input.
 */

import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type { TextNodeData } from '@scene/nodes/base-node';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import { TextCursor, createTextCursor, type TextSelection } from './text-cursor';
import { TextInputHandler, createTextInputHandler, type TextChange } from './text-input-handler';

/**
 * Text edit tool state
 */
export type TextEditToolState = 'INACTIVE' | 'EDITING' | 'SELECTING';

/**
 * Text edit tool options
 */
export interface TextEditToolOptions {
  /** Cursor blink interval in milliseconds */
  readonly blinkInterval?: number;
  /** Cursor width in pixels */
  readonly cursorWidth?: number;
  /** Selection background color */
  readonly selectionColor?: string;
  /** Cursor color */
  readonly cursorColor?: string;
}

const DEFAULT_OPTIONS: Required<TextEditToolOptions> = {
  blinkInterval: 530,
  cursorWidth: 2,
  selectionColor: 'rgba(0, 102, 255, 0.3)',
  cursorColor: '#0066FF',
};

/**
 * Character position info for hit testing
 */
export interface CharacterPosition {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly lineIndex: number;
}

/**
 * Line info for cursor positioning
 */
export interface LineInfo {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly y: number;
  readonly height: number;
  readonly baseline: number;
}

/**
 * Text layout query interface (to be implemented by text renderer)
 */
export interface TextLayoutQuery {
  /** Get character position at a given character index */
  getCharacterPosition(index: number): CharacterPosition | null;
  /** Get character index at a given point (returns closest character) */
  hitTestPoint(point: Point): { index: number; trailing: boolean };
  /** Get line info for a given line index */
  getLineInfo(lineIndex: number): LineInfo | null;
  /** Get line count */
  getLineCount(): number;
  /** Get the line containing a character index */
  getLineForCharacter(charIndex: number): number;
  /** Get all character positions for a range (for selection rendering) */
  getCharacterPositions(start: number, end: number): CharacterPosition[];
}

/**
 * Text edit tool for editing text nodes
 */
export class TextEditTool extends BaseTool {
  readonly name = 'text-edit';
  cursor: ToolCursor = 'text';

  private options: Required<TextEditToolOptions>;
  private state: TextEditToolState = 'INACTIVE';
  private editingNodeId: NodeId | null = null;
  private textCursor: TextCursor;
  private inputHandler: TextInputHandler | null = null;
  private currentText: string = '';
  private cursorVisible = true;

  // Layout query for hit testing (set by external system)
  private layoutQuery: TextLayoutQuery | null = null;

  // Callbacks
  private onTextUpdate?: (nodeId: NodeId, text: string, change: TextChange) => void;
  private onEditStart?: (nodeId: NodeId) => void;
  private onEditEnd?: (nodeId: NodeId) => void;
  private onRequestRedraw?: () => void;

  constructor(options: TextEditToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.textCursor = createTextCursor({
      blinkInterval: this.options.blinkInterval,
      cursorWidth: this.options.cursorWidth,
    });
  }

  /**
   * Set callback for text updates.
   */
  setOnTextUpdate(callback: (nodeId: NodeId, text: string, change: TextChange) => void): void {
    this.onTextUpdate = callback;
  }

  /**
   * Set callback for edit start.
   */
  setOnEditStart(callback: (nodeId: NodeId) => void): void {
    this.onEditStart = callback;
  }

  /**
   * Set callback for edit end.
   */
  setOnEditEnd(callback: (nodeId: NodeId) => void): void {
    this.onEditEnd = callback;
  }

  /**
   * Set callback for redraw requests.
   */
  setOnRequestRedraw(callback: () => void): void {
    this.onRequestRedraw = callback;
  }

  /**
   * Set the layout query for hit testing.
   */
  setLayoutQuery(query: TextLayoutQuery | null): void {
    this.layoutQuery = query;
  }

  /**
   * Get current tool state.
   */
  getState(): TextEditToolState {
    return this.state;
  }

  /**
   * Get the currently editing node ID.
   */
  getEditingNodeId(): NodeId | null {
    return this.editingNodeId;
  }

  /**
   * Check if currently editing.
   */
  isEditing(): boolean {
    return this.state !== 'INACTIVE';
  }

  /**
   * Get current cursor position.
   */
  getCursorPosition(): number {
    return this.textCursor.position;
  }

  /**
   * Get current selection.
   */
  getSelection(): TextSelection | null {
    return this.textCursor.getSelection();
  }

  /**
   * Start editing a text node.
   */
  startEditing(nodeId: NodeId, text: string, cursorPosition?: number): void {
    if (this.state !== 'INACTIVE') {
      this.stopEditing();
    }

    this.editingNodeId = nodeId;
    this.currentText = text;
    this.state = 'EDITING';

    // Set cursor position
    const position = cursorPosition ?? text.length;
    this.textCursor.setPosition(position, text.length);

    // Create input handler
    this.inputHandler = createTextInputHandler(this.textCursor, text, {
      multiline: true,
    });

    this.inputHandler.setOnTextChange((change, newText) => {
      this.currentText = newText;
      if (this.editingNodeId) {
        this.onTextUpdate?.(this.editingNodeId, newText, change);
      }
      this.onRequestRedraw?.();
    });

    this.inputHandler.setOnExit(() => {
      this.stopEditing();
    });

    // Start cursor blinking
    this.textCursor.startBlinking((visible) => {
      this.cursorVisible = visible;
      this.onRequestRedraw?.();
    });

    this.onEditStart?.(nodeId);
    this.onRequestRedraw?.();
  }

  /**
   * Stop editing.
   */
  stopEditing(): void {
    if (this.state === 'INACTIVE') return;

    const nodeId = this.editingNodeId;

    this.textCursor.stopBlinking();
    this.inputHandler?.dispose();
    this.inputHandler = null;
    this.editingNodeId = null;
    this.currentText = '';
    this.state = 'INACTIVE';
    this.layoutQuery = null;

    if (nodeId) {
      this.onEditEnd?.(nodeId);
    }
    this.onRequestRedraw?.();
  }

  override activate(context: ToolContext): void {
    super.activate(context);
  }

  override deactivate(): void {
    this.stopEditing();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    const worldPoint = { x: event.worldX, y: event.worldY };

    if (this.state !== 'INACTIVE') {
      // Check if clicking outside the editing node
      if (this.editingNodeId) {
        const node = context.sceneGraph.getNode(this.editingNodeId);
        if (node && !this.isPointInNode(worldPoint, node, context)) {
          this.stopEditing();
          return false;
        }
      }

      // Position cursor at click point
      if (this.layoutQuery) {
        const hit = this.layoutQuery.hitTestPoint(worldPoint);
        const position = hit.trailing ? hit.index + 1 : hit.index;

        if (event.shiftKey) {
          // Extend selection
          this.textCursor.move(
            position - this.textCursor.position,
            this.currentText.length,
            true
          );
        } else {
          // Set cursor position
          this.textCursor.setPosition(position, this.currentText.length);
        }

        this.state = 'SELECTING';
        this.onRequestRedraw?.();
      }

      return true;
    }

    return false;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    if (this.state === 'SELECTING' && this.layoutQuery) {
      const worldPoint = { x: event.worldX, y: event.worldY };
      const hit = this.layoutQuery.hitTestPoint(worldPoint);
      const position = hit.trailing ? hit.index + 1 : hit.index;

      // Extend selection to current position
      this.textCursor.move(
        position - this.textCursor.position,
        this.currentText.length,
        true
      );

      this.onRequestRedraw?.();
    }
  }

  override onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    if (this.state === 'SELECTING') {
      this.state = 'EDITING';
    }
  }

  override onDoubleClick(event: PointerEventData, context: ToolContext): void {
    const worldPoint = { x: event.worldX, y: event.worldY };

    if (this.state === 'INACTIVE') {
      // Find text node at click position
      const hitNode = this.findTextNodeAt(worldPoint, context);
      if (hitNode) {
        const nodeData = context.sceneGraph.getNode(hitNode) as TextNodeData;
        if (nodeData?.type === 'TEXT') {
          this.startEditing(hitNode, nodeData.characters);

          // Select word at double-click position
          if (this.layoutQuery) {
            const hit = this.layoutQuery.hitTestPoint(worldPoint);
            this.textCursor.selectWordAt(this.currentText, hit.index);
            this.onRequestRedraw?.();
          }
        }
      }
    } else if (this.layoutQuery) {
      // Double-click while editing: select word
      const hit = this.layoutQuery.hitTestPoint(worldPoint);
      this.textCursor.selectWordAt(this.currentText, hit.index);
      this.onRequestRedraw?.();
    }
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (this.state === 'INACTIVE') {
      return false;
    }

    if (this.inputHandler) {
      return this.inputHandler.handleKeyDown(event);
    }

    return false;
  }

  override getCursor(_point: Point, _context: ToolContext): ToolCursor {
    return 'text';
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (this.state === 'INACTIVE' || !this.editingNodeId) return;

    const node = context.sceneGraph.getNode(this.editingNodeId);
    if (!node) return;

    const viewport = context.viewport;

    ctx.save();

    // Get text node world bounds (accounts for parent transforms)
    const worldBounds = context.sceneGraph.getWorldBounds(this.editingNodeId);
    if (!worldBounds) {
      ctx.restore();
      return;
    }
    const nodeX = worldBounds.x;
    const nodeY = worldBounds.y;
    const nodeWidth = worldBounds.width;
    const nodeHeight = worldBounds.height;

    // Draw bounding box outline
    const lineWidth = 1 / viewport.getZoom();
    ctx.strokeStyle = this.options.cursorColor;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([4 / viewport.getZoom(), 4 / viewport.getZoom()]);
    ctx.strokeRect(nodeX, nodeY, nodeWidth, nodeHeight);
    ctx.setLineDash([]);

    // Render text content (since WebGL renderer doesn't render text yet)
    if (this.currentText.length > 0) {
      // Get text node properties for styling
      const textNode = node as unknown as {
        fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number }; visible?: boolean }>;
        textStyles?: Array<{ fontSize?: number; fontFamily?: string; fontWeight?: number }>;
      };

      // Get font size from text styles or use default
      const fontSize = textNode.textStyles?.[0]?.fontSize ?? 16;
      const fontFamily = textNode.textStyles?.[0]?.fontFamily ?? 'Inter, sans-serif';
      const fontWeight = textNode.textStyles?.[0]?.fontWeight ?? 400;

      // Get fill color
      let fillColor = 'black';
      const fill = textNode.fills?.find(f => f.visible !== false && f.type === 'SOLID');
      if (fill?.color) {
        const c = fill.color;
        fillColor = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a})`;
      }

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = fillColor;
      ctx.textBaseline = 'top';

      // Render text lines
      const lines = this.currentText.split('\n');
      let y = nodeY;
      const lineHeight = fontSize * 1.2;

      for (const line of lines) {
        ctx.fillText(line, nodeX, y);
        y += lineHeight;
      }
    }

    // Canvas container already applies viewport transform, so we render in world coords
    // Draw selection
    const selection = this.textCursor.getSelection();
    if (selection && this.layoutQuery) {
      const positions = this.layoutQuery.getCharacterPositions(selection.start, selection.end);

      ctx.fillStyle = this.options.selectionColor;

      // Group characters by line for contiguous selection rectangles
      let currentLineY: number | null = null;
      let lineStartX = 0;
      let lineWidth = 0;
      let lineHeight = 0;

      for (const pos of positions) {
        if (currentLineY === null || pos.y !== currentLineY) {
          // Draw previous line's selection
          if (currentLineY !== null && lineWidth > 0) {
            ctx.fillRect(lineStartX, currentLineY, lineWidth, lineHeight);
          }

          // Start new line
          currentLineY = pos.y;
          lineStartX = pos.x;
          lineWidth = pos.width;
          lineHeight = pos.height;
        } else {
          // Extend current line
          lineWidth = (pos.x + pos.width) - lineStartX;
          lineHeight = Math.max(lineHeight, pos.height);
        }
      }

      // Draw last line's selection
      if (currentLineY !== null && lineWidth > 0) {
        ctx.fillRect(lineStartX, currentLineY, lineWidth, lineHeight);
      }
    }

    // Draw cursor
    if (this.cursorVisible && !selection) {
      const cursorPos = this.textCursor.position;
      let cursorX: number;
      let cursorY: number;
      let cursorHeight: number;

      // Use world coordinates (nodeX, nodeY already set from worldBounds above)
      const defaultFontSize = 16; // Default font size for cursor height

      if (this.layoutQuery) {
        // Use layout query for precise cursor positioning
        if (this.currentText.length === 0) {
          // Empty text - use first line info
          const lineInfo = this.layoutQuery.getLineInfo(0);
          if (lineInfo) {
            cursorX = nodeX;
            cursorY = lineInfo.y;
            cursorHeight = lineInfo.height;
          } else {
            cursorX = nodeX;
            cursorY = nodeY;
            cursorHeight = defaultFontSize;
          }
        } else if (cursorPos >= this.currentText.length) {
          // Cursor at end
          const lastPos = this.layoutQuery.getCharacterPosition(this.currentText.length - 1);
          if (lastPos) {
            cursorX = lastPos.x + lastPos.width;
            cursorY = lastPos.y;
            cursorHeight = lastPos.height;
          } else {
            cursorX = nodeX;
            cursorY = nodeY;
            cursorHeight = defaultFontSize;
          }
        } else {
          // Cursor before a character
          const charPos = this.layoutQuery.getCharacterPosition(cursorPos);
          if (charPos) {
            cursorX = charPos.x;
            cursorY = charPos.y;
            cursorHeight = charPos.height;
          } else {
            cursorX = nodeX;
            cursorY = nodeY;
            cursorHeight = defaultFontSize;
          }
        }
      } else {
        // No layout query - use simplified cursor placement based on node position
        // For empty text or start position, cursor at node origin
        // For non-empty text, estimate position based on character count
        cursorX = nodeX;
        cursorY = nodeY;
        cursorHeight = defaultFontSize;

        // Simple estimation: assume ~8px per character for cursor position
        if (this.currentText.length > 0 && cursorPos > 0) {
          cursorX += Math.min(cursorPos, this.currentText.length) * 8;
        }
      }

      ctx.fillStyle = this.options.cursorColor;
      ctx.fillRect(
        cursorX,
        cursorY,
        this.options.cursorWidth / viewport.getZoom(),
        cursorHeight
      );
    }

    ctx.restore();
  }

  /**
   * Find a text node at the given point.
   */
  private findTextNodeAt(point: Point, context: ToolContext): NodeId | null {
    // Simple hit test - iterate through pages and their children
    // In a real implementation, this would use a spatial index
    const pages = context.sceneGraph.getPages();

    for (const page of pages) {
      const result = this.hitTestNode(page.id, point, context);
      if (result) return result;
    }

    return null;
  }

  /**
   * Recursively hit test a node and its children.
   */
  private hitTestNode(nodeId: NodeId, point: Point, context: ToolContext): NodeId | null {
    const data = context.sceneGraph.getNode(nodeId);
    if (!data) return null;

    // Check children first (they're on top)
    const childIds = context.sceneGraph.getChildIds(nodeId);
    for (let i = childIds.length - 1; i >= 0; i--) {
      const result = this.hitTestNode(childIds[i]!, point, context);
      if (result) return result;
    }

    // Check this node if it's a text node
    if (data.type === 'TEXT') {
      if (this.isPointInNode(point, data, context)) {
        return nodeId;
      }
    }

    return null;
  }

  /**
   * Check if a point is inside a node's bounds.
   * Note: This is a simplified implementation that assumes no rotation.
   * A full implementation would compute world transform from ancestors.
   */
  private isPointInNode(point: Point, data: { id: NodeId }, context: ToolContext): boolean {
    const nodeData = context.sceneGraph.getNode(data.id);
    if (!nodeData) return false;

    // Get position from node data (simplified - no rotation support)
    const nodeWithPos = nodeData as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };

    // Compute world position by accumulating ancestor transforms
    let worldX = nodeWithPos.x ?? 0;
    let worldY = nodeWithPos.y ?? 0;

    const ancestors = context.sceneGraph.getAncestors(data.id);
    for (const ancestor of ancestors) {
      const ancestorWithPos = ancestor as { x?: number; y?: number };
      worldX += ancestorWithPos.x ?? 0;
      worldY += ancestorWithPos.y ?? 0;
    }

    const bounds = {
      x: worldX,
      y: worldY,
      width: nodeWithPos.width ?? 0,
      height: nodeWithPos.height ?? 0,
    };

    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stopEditing();
    this.textCursor.dispose();
  }
}

/**
 * Create a text edit tool.
 */
export function createTextEditTool(options?: TextEditToolOptions): TextEditTool {
  return new TextEditTool(options);
}
