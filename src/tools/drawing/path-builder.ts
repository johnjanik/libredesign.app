/**
 * Path Builder
 *
 * Builds vector paths from pen tool interactions.
 * Supports anchor points, bezier control handles, and path closure.
 */

import type { Point, VectorPath, PathCommand, WindingRule } from '@core/types/geometry';

/**
 * Anchor point with optional control handles
 */
export interface AnchorPoint {
  /** Anchor position */
  readonly position: Point;
  /** Control handle for incoming curve (before this anchor) */
  readonly handleIn: Point | null;
  /** Control handle for outgoing curve (after this anchor) */
  readonly handleOut: Point | null;
}

/**
 * Path builder state
 */
export interface PathBuilderState {
  readonly anchors: readonly AnchorPoint[];
  readonly isClosed: boolean;
  readonly windingRule: WindingRule;
}

/**
 * Path builder for constructing vector paths interactively
 */
export class PathBuilder {
  private anchors: AnchorPoint[] = [];
  private isClosed = false;
  private windingRule: WindingRule = 'NONZERO';

  /**
   * Get the current state of the path builder.
   */
  getState(): PathBuilderState {
    return {
      anchors: [...this.anchors],
      isClosed: this.isClosed,
      windingRule: this.windingRule,
    };
  }

  /**
   * Add an anchor point at the specified position.
   */
  addAnchor(position: Point, handleIn: Point | null = null, handleOut: Point | null = null): void {
    if (this.isClosed) {
      throw new Error('Cannot add anchor to closed path');
    }

    this.anchors.push({
      position,
      handleIn,
      handleOut,
    });
  }

  /**
   * Add a corner anchor (no handles).
   */
  addCorner(position: Point): void {
    this.addAnchor(position, null, null);
  }

  /**
   * Add a smooth anchor with symmetric handles.
   */
  addSmooth(position: Point, handle: Point): void {
    // Create symmetric handles
    const handleOut = handle;
    const handleIn = {
      x: position.x - (handle.x - position.x),
      y: position.y - (handle.y - position.y),
    };
    this.addAnchor(position, handleIn, handleOut);
  }

  /**
   * Update the handle of the last anchor point (for drag operations).
   */
  setLastAnchorHandle(handleOut: Point): void {
    if (this.anchors.length === 0) return;

    const lastIndex = this.anchors.length - 1;
    const lastAnchor = this.anchors[lastIndex]!;

    // Create symmetric handles
    const handleIn = {
      x: lastAnchor.position.x - (handleOut.x - lastAnchor.position.x),
      y: lastAnchor.position.y - (handleOut.y - lastAnchor.position.y),
    };

    this.anchors[lastIndex] = {
      ...lastAnchor,
      handleIn,
      handleOut,
    };
  }

  /**
   * Update a specific anchor's outgoing handle.
   */
  setAnchorHandleOut(index: number, handleOut: Point): void {
    if (index < 0 || index >= this.anchors.length) return;

    const anchor = this.anchors[index]!;
    this.anchors[index] = {
      ...anchor,
      handleOut,
    };
  }

  /**
   * Update a specific anchor's incoming handle.
   */
  setAnchorHandleIn(index: number, handleIn: Point): void {
    if (index < 0 || index >= this.anchors.length) return;

    const anchor = this.anchors[index]!;
    this.anchors[index] = {
      ...anchor,
      handleIn,
    };
  }

  /**
   * Get the last anchor point.
   */
  getLastAnchor(): AnchorPoint | null {
    return this.anchors.length > 0 ? this.anchors[this.anchors.length - 1]! : null;
  }

  /**
   * Get the first anchor point.
   */
  getFirstAnchor(): AnchorPoint | null {
    return this.anchors.length > 0 ? this.anchors[0]! : null;
  }

  /**
   * Get anchor at index.
   */
  getAnchor(index: number): AnchorPoint | null {
    return this.anchors[index] ?? null;
  }

  /**
   * Get the number of anchors.
   */
  get anchorCount(): number {
    return this.anchors.length;
  }

  /**
   * Close the path.
   */
  close(): void {
    if (this.anchors.length < 2) {
      throw new Error('Need at least 2 anchors to close path');
    }
    this.isClosed = true;
  }

  /**
   * Check if the path is closed.
   */
  get closed(): boolean {
    return this.isClosed;
  }

  /**
   * Set the winding rule.
   */
  setWindingRule(rule: WindingRule): void {
    this.windingRule = rule;
  }

  /**
   * Remove the last anchor point.
   */
  removeLastAnchor(): void {
    if (this.anchors.length > 0) {
      this.anchors.pop();
      this.isClosed = false;
    }
  }

  /**
   * Clear all anchors.
   */
  clear(): void {
    this.anchors = [];
    this.isClosed = false;
  }

  /**
   * Check if a point is near the first anchor (for closing).
   */
  isNearFirstAnchor(point: Point, threshold: number): boolean {
    if (this.anchors.length < 2) return false;

    const first = this.anchors[0]!;
    const dx = point.x - first.position.x;
    const dy = point.y - first.position.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }

  /**
   * Build the final VectorPath from the current anchors.
   */
  build(): VectorPath {
    if (this.anchors.length === 0) {
      return {
        windingRule: this.windingRule,
        commands: [],
      };
    }

    const commands: PathCommand[] = [];
    const first = this.anchors[0]!;

    // MoveTo first point
    commands.push({
      type: 'M',
      x: first.position.x,
      y: first.position.y,
    });

    // Process segments
    for (let i = 1; i < this.anchors.length; i++) {
      const prev = this.anchors[i - 1]!;
      const curr = this.anchors[i]!;

      if (prev.handleOut && curr.handleIn) {
        // Cubic bezier curve
        commands.push({
          type: 'C',
          x1: prev.handleOut.x,
          y1: prev.handleOut.y,
          x2: curr.handleIn.x,
          y2: curr.handleIn.y,
          x: curr.position.x,
          y: curr.position.y,
        });
      } else if (prev.handleOut) {
        // Curve with only outgoing handle (approximate with cubic)
        const midX = (prev.handleOut.x + curr.position.x) / 2;
        const midY = (prev.handleOut.y + curr.position.y) / 2;
        commands.push({
          type: 'C',
          x1: prev.handleOut.x,
          y1: prev.handleOut.y,
          x2: midX,
          y2: midY,
          x: curr.position.x,
          y: curr.position.y,
        });
      } else if (curr.handleIn) {
        // Curve with only incoming handle (approximate with cubic)
        const midX = (prev.position.x + curr.handleIn.x) / 2;
        const midY = (prev.position.y + curr.handleIn.y) / 2;
        commands.push({
          type: 'C',
          x1: midX,
          y1: midY,
          x2: curr.handleIn.x,
          y2: curr.handleIn.y,
          x: curr.position.x,
          y: curr.position.y,
        });
      } else {
        // Straight line
        commands.push({
          type: 'L',
          x: curr.position.x,
          y: curr.position.y,
        });
      }
    }

    // Close path if needed
    if (this.isClosed) {
      const last = this.anchors[this.anchors.length - 1]!;

      if (last.handleOut || first.handleIn) {
        // Curved closure
        commands.push({
          type: 'C',
          x1: last.handleOut?.x ?? last.position.x,
          y1: last.handleOut?.y ?? last.position.y,
          x2: first.handleIn?.x ?? first.position.x,
          y2: first.handleIn?.y ?? first.position.y,
          x: first.position.x,
          y: first.position.y,
        });
      }

      commands.push({ type: 'Z' });
    }

    return {
      windingRule: this.windingRule,
      commands,
    };
  }

  /**
   * Create a path builder from an existing VectorPath.
   */
  static fromPath(path: VectorPath): PathBuilder {
    const builder = new PathBuilder();
    builder.windingRule = path.windingRule;

    let currentPoint: Point = { x: 0, y: 0 };
    let lastHandleOut: Point | null = null;

    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          currentPoint = { x: cmd.x, y: cmd.y };
          builder.addAnchor(currentPoint, null, null);
          break;

        case 'L':
          currentPoint = { x: cmd.x, y: cmd.y };
          // Update previous anchor's handleOut if we have one
          if (lastHandleOut && builder.anchors.length > 0) {
            builder.setAnchorHandleOut(builder.anchors.length - 1, lastHandleOut);
          }
          lastHandleOut = null;
          builder.addAnchor(currentPoint, null, null);
          break;

        case 'C':
          // Set previous anchor's outgoing handle
          if (builder.anchors.length > 0) {
            builder.setAnchorHandleOut(builder.anchors.length - 1, { x: cmd.x1, y: cmd.y1 });
          }
          currentPoint = { x: cmd.x, y: cmd.y };
          builder.addAnchor(currentPoint, { x: cmd.x2, y: cmd.y2 }, null);
          break;

        case 'Z':
          builder.isClosed = true;
          break;
      }
    }

    return builder;
  }
}

/**
 * Create a new path builder.
 */
export function createPathBuilder(): PathBuilder {
  return new PathBuilder();
}
