/**
 * Hand Tool
 *
 * Allows panning the canvas by clicking and dragging.
 */
import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '../base/tool';
/**
 * Hand tool for panning the viewport
 */
export declare class HandTool extends BaseTool {
    readonly name = "hand";
    cursor: ToolCursor;
    private isPanning;
    private lastCanvasX;
    private lastCanvasY;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    deactivate(): void;
}
/**
 * Create a hand tool.
 */
export declare function createHandTool(): HandTool;
//# sourceMappingURL=hand-tool.d.ts.map