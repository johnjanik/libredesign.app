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
  readonly clipPath?: number; // Index into clip paths
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
  readonly vertices: Float32Array;  // Position + normal interleaved
  readonly indices: Uint16Array;
}

/**
 * Text draw command
 */
export interface TextDrawCommand extends BaseDrawCommand {
  readonly type: 'text';
  readonly color: RGBA;
  readonly vertices: Float32Array;  // Position + texcoord
  readonly indices: Uint16Array;
  readonly atlasId: string;
}

/**
 * Image draw command
 */
export interface ImageDrawCommand extends BaseDrawCommand {
  readonly type: 'image';
  readonly textureId: string;
  readonly vertices: Float32Array;  // Position + texcoord
}

/**
 * Union of all draw commands
 */
export type DrawCommand =
  | FillDrawCommand
  | StrokeDrawCommand
  | TextDrawCommand
  | ImageDrawCommand;

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
export class BatchBuilder {
  private commands: DrawCommand[] = [];

  /**
   * Add a fill command.
   */
  addFill(
    nodeId: NodeId,
    transform: Matrix2x3,
    color: RGBA,
    vertices: Float32Array,
    indices: Uint16Array,
    opacity: number = 1,
    blendMode: BlendMode = 'NORMAL'
  ): void {
    this.commands.push({
      type: 'fill',
      nodeId,
      transform,
      color,
      vertices,
      indices,
      opacity,
      blendMode,
    });
  }

  /**
   * Add a stroke command.
   */
  addStroke(
    nodeId: NodeId,
    transform: Matrix2x3,
    color: RGBA,
    strokeWidth: number,
    vertices: Float32Array,
    indices: Uint16Array,
    opacity: number = 1,
    blendMode: BlendMode = 'NORMAL'
  ): void {
    this.commands.push({
      type: 'stroke',
      nodeId,
      transform,
      color,
      strokeWidth,
      vertices,
      indices,
      opacity,
      blendMode,
    });
  }

  /**
   * Add a text command.
   */
  addText(
    nodeId: NodeId,
    transform: Matrix2x3,
    color: RGBA,
    vertices: Float32Array,
    indices: Uint16Array,
    atlasId: string,
    opacity: number = 1,
    blendMode: BlendMode = 'NORMAL'
  ): void {
    this.commands.push({
      type: 'text',
      nodeId,
      transform,
      color,
      vertices,
      indices,
      atlasId,
      opacity,
      blendMode,
    });
  }

  /**
   * Add an image command.
   */
  addImage(
    nodeId: NodeId,
    transform: Matrix2x3,
    textureId: string,
    vertices: Float32Array,
    opacity: number = 1,
    blendMode: BlendMode = 'NORMAL'
  ): void {
    this.commands.push({
      type: 'image',
      nodeId,
      transform,
      textureId,
      vertices,
      opacity,
      blendMode,
    });
  }

  /**
   * Build batches from accumulated commands.
   */
  build(): DrawBatch[] {
    // Group commands by type and other batch-breaking properties
    const batches: DrawBatch[] = [];
    let currentBatch: DrawCommand[] = [];
    let currentType: DrawType | null = null;

    for (const cmd of this.commands) {
      // Check if we need to break the batch
      if (currentType !== cmd.type || this.shouldBreakBatch(currentBatch, cmd)) {
        if (currentBatch.length > 0) {
          batches.push(this.createBatch(currentType!, currentBatch));
        }
        currentBatch = [];
        currentType = cmd.type;
      }

      currentBatch.push(cmd);
    }

    // Finalize last batch
    if (currentBatch.length > 0 && currentType) {
      batches.push(this.createBatch(currentType, currentBatch));
    }

    return batches;
  }

  /**
   * Check if we should break the current batch.
   */
  private shouldBreakBatch(current: DrawCommand[], next: DrawCommand): boolean {
    if (current.length === 0) return false;

    // Break on blend mode change
    const last = current[current.length - 1]!;
    if (last.blendMode !== next.blendMode) return true;

    // Break on texture change for text/image
    if (next.type === 'text') {
      const lastText = last as TextDrawCommand;
      const nextText = next as TextDrawCommand;
      if (lastText.atlasId !== nextText.atlasId) return true;
    }

    if (next.type === 'image') {
      const lastImage = last as ImageDrawCommand;
      const nextImage = next as ImageDrawCommand;
      if (lastImage.textureId !== nextImage.textureId) return true;
    }

    return false;
  }

  /**
   * Create a batch from commands.
   */
  private createBatch(type: DrawType, commands: DrawCommand[]): DrawBatch {
    // Calculate total buffer sizes
    let totalVertices = 0;
    let totalIndices = 0;

    for (const cmd of commands) {
      if ('vertices' in cmd) {
        totalVertices += cmd.vertices.length;
      }
      if ('indices' in cmd) {
        totalIndices += cmd.indices.length;
      }
    }

    // Merge buffers
    const vertexBuffer = new Float32Array(totalVertices);
    const indexBuffer = new Uint16Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;
    let baseVertex = 0;

    for (const cmd of commands) {
      if ('vertices' in cmd) {
        vertexBuffer.set(cmd.vertices, vertexOffset);
        const vertexCount = cmd.vertices.length / this.getVertexSize(type);
        vertexOffset += cmd.vertices.length;

        if ('indices' in cmd) {
          // Adjust indices for merged buffer
          for (let i = 0; i < cmd.indices.length; i++) {
            indexBuffer[indexOffset + i] = cmd.indices[i]! + baseVertex;
          }
          indexOffset += cmd.indices.length;
        }

        baseVertex += vertexCount;
      }
    }

    return {
      type,
      commands,
      vertexBuffer,
      indexBuffer,
      instanceCount: commands.length,
    };
  }

  /**
   * Get vertex size for a draw type.
   */
  private getVertexSize(type: DrawType): number {
    switch (type) {
      case 'fill': return 2;      // x, y
      case 'stroke': return 4;    // x, y, nx, ny
      case 'text': return 4;      // x, y, u, v
      case 'image': return 4;     // x, y, u, v
    }
  }

  /**
   * Clear all commands.
   */
  clear(): void {
    this.commands = [];
  }

  /**
   * Get command count.
   */
  get commandCount(): number {
    return this.commands.length;
  }
}

/**
 * Create a batch builder.
 */
export function createBatchBuilder(): BatchBuilder {
  return new BatchBuilder();
}
