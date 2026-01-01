/**
 * Text Edit Tool
 *
 * Handles text editing within text nodes.
 * Supports cursor positioning, selection, and keyboard input.
 */
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import { type TextSelection } from './text-cursor';
import { type TextChange } from './text-input-handler';
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
    hitTestPoint(point: Point): {
        index: number;
        trailing: boolean;
    };
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
export declare class TextEditTool extends BaseTool {
    readonly name = "text-edit";
    cursor: ToolCursor;
    private options;
    private state;
    private editingNodeId;
    private textCursor;
    private inputHandler;
    private currentText;
    private cursorVisible;
    private layoutQuery;
    private onTextUpdate?;
    private onEditStart?;
    private onEditEnd?;
    private onRequestRedraw?;
    constructor(options?: TextEditToolOptions);
    /**
     * Set callback for text updates.
     */
    setOnTextUpdate(callback: (nodeId: NodeId, text: string, change: TextChange) => void): void;
    /**
     * Set callback for edit start.
     */
    setOnEditStart(callback: (nodeId: NodeId) => void): void;
    /**
     * Set callback for edit end.
     */
    setOnEditEnd(callback: (nodeId: NodeId) => void): void;
    /**
     * Set callback for redraw requests.
     */
    setOnRequestRedraw(callback: () => void): void;
    /**
     * Set the layout query for hit testing.
     */
    setLayoutQuery(query: TextLayoutQuery | null): void;
    /**
     * Get current tool state.
     */
    getState(): TextEditToolState;
    /**
     * Get the currently editing node ID.
     */
    getEditingNodeId(): NodeId | null;
    /**
     * Check if currently editing.
     */
    isEditing(): boolean;
    /**
     * Get current cursor position.
     */
    getCursorPosition(): number;
    /**
     * Get current selection.
     */
    getSelection(): TextSelection | null;
    /**
     * Start editing a text node.
     */
    startEditing(nodeId: NodeId, text: string, cursorPosition?: number): void;
    /**
     * Stop editing.
     */
    stopEditing(): void;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    onDoubleClick(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    getCursor(_point: Point, _context: ToolContext): ToolCursor;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Find a text node at the given point.
     */
    private findTextNodeAt;
    /**
     * Recursively hit test a node and its children.
     */
    private hitTestNode;
    /**
     * Check if a point is inside a node's bounds.
     * Note: This is a simplified implementation that assumes no rotation.
     * A full implementation would compute world transform from ancestors.
     */
    private isPointInNode;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a text edit tool.
 */
export declare function createTextEditTool(options?: TextEditToolOptions): TextEditTool;
//# sourceMappingURL=text-edit-tool.d.ts.map