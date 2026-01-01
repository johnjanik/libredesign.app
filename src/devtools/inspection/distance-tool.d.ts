/**
 * Distance Tool
 *
 * Measures distances between elements.
 */
import type { Point } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '@tools/base/tool';
/** Measurement between two points */
export interface Measurement {
    readonly type: 'horizontal' | 'vertical' | 'diagonal';
    readonly from: Point;
    readonly to: Point;
    readonly distance: number;
}
/** Distance tool options */
export interface DistanceToolOptions {
    /** Color for measurement lines */
    lineColor?: string;
    /** Color for measurement text */
    textColor?: string;
    /** Show grid alignment guides */
    showGuides?: boolean;
}
/**
 * Distance Tool
 *
 * Shows measurements between the selected element and hovered element.
 */
export declare class DistanceTool extends BaseTool {
    readonly name = "distance";
    cursor: ToolCursor;
    private hoveredNodeId;
    private measurements;
    private options;
    constructor(options?: DistanceToolOptions);
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerMove(event: PointerEventData, context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    private hitTest;
    private calculateDistances;
    private calculateDistancesToPoint;
    private renderMeasurementLine;
}
/**
 * Create a distance tool.
 */
export declare function createDistanceTool(options?: DistanceToolOptions): DistanceTool;
//# sourceMappingURL=distance-tool.d.ts.map