/**
 * Tool - Base interface for interaction tools
 */
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { Viewport } from '@renderer/core/viewport';
/**
 * Pointer event data
 */
export interface PointerEventData {
    readonly canvasX: number;
    readonly canvasY: number;
    readonly worldX: number;
    readonly worldY: number;
    readonly button: number;
    readonly buttons: number;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
    readonly pressure?: number;
}
/**
 * Keyboard event data
 */
export interface KeyEventData {
    readonly key: string;
    readonly code: string;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
    readonly repeat: boolean;
}
/**
 * Tool context - shared state for tools
 */
export interface ToolContext {
    readonly sceneGraph: SceneGraph;
    readonly viewport: Viewport;
    readonly selectedNodeIds: readonly NodeId[];
    readonly hoveredNodeId: NodeId | null;
}
/**
 * Tool cursor types
 */
export type ToolCursor = 'default' | 'pointer' | 'crosshair' | 'grab' | 'grabbing' | 'move' | 'nwse-resize' | 'nesw-resize' | 'ns-resize' | 'ew-resize' | 'rotate' | 'text';
/**
 * Base Tool interface
 */
export interface Tool {
    /** Tool name */
    readonly name: string;
    /** Tool cursor */
    readonly cursor: ToolCursor;
    /** Called when tool becomes active */
    activate?(context: ToolContext): void;
    /** Called when tool is deactivated */
    deactivate?(): void;
    /** Handle pointer down */
    onPointerDown?(event: PointerEventData, context: ToolContext): boolean;
    /** Handle pointer move */
    onPointerMove?(event: PointerEventData, context: ToolContext): void;
    /** Handle pointer up */
    onPointerUp?(event: PointerEventData, context: ToolContext): void;
    /** Handle key down */
    onKeyDown?(event: KeyEventData, context: ToolContext): boolean;
    /** Handle key up */
    onKeyUp?(event: KeyEventData, context: ToolContext): void;
    /** Handle double click */
    onDoubleClick?(event: PointerEventData, context: ToolContext): void;
    /** Handle wheel (for zooming) */
    onWheel?(event: WheelEvent, context: ToolContext): void;
    /** Get cursor for current position */
    getCursor?(point: Point, context: ToolContext): ToolCursor;
    /** Render tool-specific overlays (guides, selection, etc.) */
    render?(ctx: CanvasRenderingContext2D, context: ToolContext): void;
}
/**
 * Abstract base tool with common functionality
 */
export declare abstract class BaseTool implements Tool {
    abstract readonly name: string;
    cursor: ToolCursor;
    protected isActive: boolean;
    protected isDragging: boolean;
    protected dragStartPoint: Point | null;
    protected lastPoint: Point | null;
    activate(_context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    onKeyDown(_event: KeyEventData, _context: ToolContext): boolean;
    getCursor(_point: Point, _context: ToolContext): ToolCursor;
    onKeyUp(_event: KeyEventData, _context: ToolContext): void;
    onDoubleClick(_event: PointerEventData, _context: ToolContext): void;
    render(_ctx: CanvasRenderingContext2D, _context: ToolContext): void;
}
//# sourceMappingURL=tool.d.ts.map