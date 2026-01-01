/**
 * Batch Generator
 *
 * Generates draw batches from scene graph nodes for efficient rendering.
 */
import type { NodeId, BlendMode } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { Matrix2x3 } from '@core/types/geometry';
/**
 * Draw call type
 */
export type DrawType = 'fill' | 'stroke' | 'text' | 'image';
/**
 * Base draw command
 */
export interface BaseDrawCommand {
    readonly type: DrawType;
    readonly nodeId: NodeId;
    readonly transform: Matrix2x3;
    readonly opacity: number;
    readonly blendMode: BlendMode;
    readonly clipPath?: number;
}
/**
 * Fill draw command
 */
export interface FillDrawCommand extends BaseDrawCommand {
    readonly type: 'fill';
    readonly color: RGBA;
    readonly vertices: Float32Array;
    readonly indices: Uint16Array;
}
/**
 * Stroke draw command
 */
export interface StrokeDrawCommand extends BaseDrawCommand {
    readonly type: 'stroke';
    readonly color: RGBA;
    readonly strokeWidth: number;
    readonly vertices: Float32Array;
    readonly indices: Uint16Array;
}
/**
 * Text draw command
 */
export interface TextDrawCommand extends BaseDrawCommand {
    readonly type: 'text';
    readonly color: RGBA;
    readonly vertices: Float32Array;
    readonly indices: Uint16Array;
    readonly atlasId: string;
}
/**
 * Image draw command
 */
export interface ImageDrawCommand extends BaseDrawCommand {
    readonly type: 'image';
    readonly textureId: string;
    readonly vertices: Float32Array;
}
/**
 * Union of all draw commands
 */
export type DrawCommand = FillDrawCommand | StrokeDrawCommand | TextDrawCommand | ImageDrawCommand;
/**
 * Draw batch - group of commands that can be drawn together
 */
export interface DrawBatch {
    readonly type: DrawType;
    readonly commands: readonly DrawCommand[];
    readonly vertexBuffer: Float32Array;
    readonly indexBuffer: Uint16Array;
    readonly instanceCount: number;
}
/**
 * Batch builder - accumulates draw commands
 */
export declare class BatchBuilder {
    private commands;
    /**
     * Add a fill command.
     */
    addFill(nodeId: NodeId, transform: Matrix2x3, color: RGBA, vertices: Float32Array, indices: Uint16Array, opacity?: number, blendMode?: BlendMode): void;
    /**
     * Add a stroke command.
     */
    addStroke(nodeId: NodeId, transform: Matrix2x3, color: RGBA, strokeWidth: number, vertices: Float32Array, indices: Uint16Array, opacity?: number, blendMode?: BlendMode): void;
    /**
     * Add a text command.
     */
    addText(nodeId: NodeId, transform: Matrix2x3, color: RGBA, vertices: Float32Array, indices: Uint16Array, atlasId: string, opacity?: number, blendMode?: BlendMode): void;
    /**
     * Add an image command.
     */
    addImage(nodeId: NodeId, transform: Matrix2x3, textureId: string, vertices: Float32Array, opacity?: number, blendMode?: BlendMode): void;
    /**
     * Build batches from accumulated commands.
     */
    build(): DrawBatch[];
    /**
     * Check if we should break the current batch.
     */
    private shouldBreakBatch;
    /**
     * Create a batch from commands.
     */
    private createBatch;
    /**
     * Get vertex size for a draw type.
     */
    private getVertexSize;
    /**
     * Clear all commands.
     */
    clear(): void;
    /**
     * Get command count.
     */
    get commandCount(): number;
}
/**
 * Create a batch builder.
 */
export declare function createBatchBuilder(): BatchBuilder;
//# sourceMappingURL=batch-generator.d.ts.map