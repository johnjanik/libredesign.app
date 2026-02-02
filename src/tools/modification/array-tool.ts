/**
 * Array Tool
 *
 * Creates arrays (copies) of selected nodes in patterns.
 * Supports:
 * - Rectangular array (grid pattern)
 * - Polar array (circular pattern)
 * - Path array (along a path) - future
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';

/**
 * Array type
 */
export type ArrayType = 'rectangular' | 'polar';

/**
 * Rectangular array options
 */
export interface RectangularArrayOptions {
  type: 'rectangular';
  /** Number of columns */
  columns: number;
  /** Number of rows */
  rows: number;
  /** Spacing between columns */
  columnSpacing: number;
  /** Spacing between rows */
  rowSpacing: number;
  /** Angle of the array (degrees) */
  angle?: number;
}

/**
 * Polar array options
 */
export interface PolarArrayOptions {
  type: 'polar';
  /** Center point of the array */
  center: Point;
  /** Number of items */
  count: number;
  /** Total angle to fill (degrees, 360 for full circle) */
  totalAngle: number;
  /** Start angle (degrees) */
  startAngle?: number;
  /** Whether to rotate items to face center */
  rotateItems: boolean;
}

/**
 * Array options union type
 */
export type ArrayOptions = RectangularArrayOptions | PolarArrayOptions;

/**
 * Array result
 */
export interface ArrayResult {
  /** Original node IDs */
  originalIds: NodeId[];
  /** New node IDs */
  newIds: NodeId[];
  /** Number of copies created */
  copyCount: number;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Calculate positions for rectangular array.
 */
export function calculateRectangularArrayPositions(
  basePosition: Point,
  options: RectangularArrayOptions
): Point[] {
  const positions: Point[] = [];
  const { columns, rows, columnSpacing, rowSpacing, angle = 0 } = options;

  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      // Skip the original position (0,0)
      if (row === 0 && col === 0) continue;

      const dx = col * columnSpacing;
      const dy = row * rowSpacing;

      // Rotate offset
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;

      positions.push({
        x: basePosition.x + rotatedX,
        y: basePosition.y + rotatedY,
      });
    }
  }

  return positions;
}

/**
 * Calculate positions for polar array.
 */
export function calculatePolarArrayPositions(
  basePosition: Point,
  options: PolarArrayOptions
): { position: Point; rotation: number }[] {
  const positions: { position: Point; rotation: number }[] = [];
  const { center, count, totalAngle, startAngle = 0, rotateItems } = options;

  if (count < 2) return positions;

  // Calculate radius from center to base position
  const radius = Math.sqrt(
    Math.pow(basePosition.x - center.x, 2) + Math.pow(basePosition.y - center.y, 2)
  );

  // Calculate base angle
  const baseAngle = Math.atan2(basePosition.y - center.y, basePosition.x - center.x);
  const startAngleRad = (startAngle * Math.PI) / 180;
  const totalAngleRad = (totalAngle * Math.PI) / 180;

  // Calculate angle increment
  const angleIncrement = totalAngleRad / (totalAngle === 360 ? count : count - 1);

  for (let i = 1; i < count; i++) {
    const angle = baseAngle + startAngleRad + i * angleIncrement;

    const position = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };

    const rotation = rotateItems ? (i * angleIncrement * 180) / Math.PI : 0;

    positions.push({ position, rotation });
  }

  return positions;
}

/**
 * Array Tool class for UI interaction
 */
export class ArrayTool {
  private type: ArrayType = 'rectangular';

  // Rectangular options
  private columns: number = 3;
  private rows: number = 3;
  private columnSpacing: number = 100;
  private rowSpacing: number = 100;
  private angle: number = 0;

  // Polar options
  private center: Point = { x: 0, y: 0 };
  private count: number = 6;
  private totalAngle: number = 360;
  private startAngle: number = 0;
  private rotateItems: boolean = true;

  // Callback for executing array operation
  private onArray?: (nodeIds: NodeId[], options: ArrayOptions) => ArrayResult;

  /**
   * Set array callback.
   */
  setOnArray(callback: (nodeIds: NodeId[], options: ArrayOptions) => ArrayResult): void {
    this.onArray = callback;
  }

  /**
   * Set array type.
   */
  setType(type: ArrayType): void {
    this.type = type;
  }

  /**
   * Get current type.
   */
  getType(): ArrayType {
    return this.type;
  }

  /**
   * Set rectangular array options.
   */
  setRectangularOptions(options: {
    columns?: number;
    rows?: number;
    columnSpacing?: number;
    rowSpacing?: number;
    angle?: number;
  }): void {
    if (options.columns !== undefined) this.columns = options.columns;
    if (options.rows !== undefined) this.rows = options.rows;
    if (options.columnSpacing !== undefined) this.columnSpacing = options.columnSpacing;
    if (options.rowSpacing !== undefined) this.rowSpacing = options.rowSpacing;
    if (options.angle !== undefined) this.angle = options.angle;
  }

  /**
   * Get rectangular array options.
   */
  getRectangularOptions(): RectangularArrayOptions {
    return {
      type: 'rectangular',
      columns: this.columns,
      rows: this.rows,
      columnSpacing: this.columnSpacing,
      rowSpacing: this.rowSpacing,
      angle: this.angle,
    };
  }

  /**
   * Set polar array options.
   */
  setPolarOptions(options: {
    center?: Point;
    count?: number;
    totalAngle?: number;
    startAngle?: number;
    rotateItems?: boolean;
  }): void {
    if (options.center !== undefined) this.center = options.center;
    if (options.count !== undefined) this.count = options.count;
    if (options.totalAngle !== undefined) this.totalAngle = options.totalAngle;
    if (options.startAngle !== undefined) this.startAngle = options.startAngle;
    if (options.rotateItems !== undefined) this.rotateItems = options.rotateItems;
  }

  /**
   * Get polar array options.
   */
  getPolarOptions(): PolarArrayOptions {
    return {
      type: 'polar',
      center: this.center,
      count: this.count,
      totalAngle: this.totalAngle,
      startAngle: this.startAngle,
      rotateItems: this.rotateItems,
    };
  }

  /**
   * Execute array operation on selected nodes.
   */
  execute(nodeIds: NodeId[]): ArrayResult {
    if (!this.onArray) {
      return { originalIds: nodeIds, newIds: [], copyCount: 0, success: false, error: 'No array callback set' };
    }

    const options = this.type === 'rectangular' ? this.getRectangularOptions() : this.getPolarOptions();
    return this.onArray(nodeIds, options);
  }

  /**
   * Create rectangular array.
   */
  createRectangularArray(nodeIds: NodeId[], columns: number, rows: number, spacing: number): ArrayResult {
    this.type = 'rectangular';
    this.columns = columns;
    this.rows = rows;
    this.columnSpacing = spacing;
    this.rowSpacing = spacing;
    return this.execute(nodeIds);
  }

  /**
   * Create polar array.
   */
  createPolarArray(nodeIds: NodeId[], center: Point, count: number, totalAngle: number = 360): ArrayResult {
    this.type = 'polar';
    this.center = center;
    this.count = count;
    this.totalAngle = totalAngle;
    return this.execute(nodeIds);
  }

  /**
   * Preview array positions for rectangular array.
   */
  previewRectangular(basePosition: Point): Point[] {
    return calculateRectangularArrayPositions(basePosition, this.getRectangularOptions());
  }

  /**
   * Preview array positions for polar array.
   */
  previewPolar(basePosition: Point): { position: Point; rotation: number }[] {
    return calculatePolarArrayPositions(basePosition, this.getPolarOptions());
  }
}

/**
 * Create an array tool.
 */
export function createArrayTool(): ArrayTool {
  return new ArrayTool();
}
