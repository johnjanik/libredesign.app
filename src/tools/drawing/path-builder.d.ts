/**
 * Path Builder
 *
 * Builds vector paths from pen tool interactions.
 * Supports anchor points, bezier control handles, and path closure.
 */
import type { Point, VectorPath, WindingRule } from '@core/types/geometry';
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
export declare class PathBuilder {
    private anchors;
    private isClosed;
    private windingRule;
    /**
     * Get the current state of the path builder.
     */
    getState(): PathBuilderState;
    /**
     * Add an anchor point at the specified position.
     */
    addAnchor(position: Point, handleIn?: Point | null, handleOut?: Point | null): void;
    /**
     * Add a corner anchor (no handles).
     */
    addCorner(position: Point): void;
    /**
     * Add a smooth anchor with symmetric handles.
     */
    addSmooth(position: Point, handle: Point): void;
    /**
     * Update the handle of the last anchor point (for drag operations).
     */
    setLastAnchorHandle(handleOut: Point): void;
    /**
     * Update a specific anchor's outgoing handle.
     */
    setAnchorHandleOut(index: number, handleOut: Point): void;
    /**
     * Update a specific anchor's incoming handle.
     */
    setAnchorHandleIn(index: number, handleIn: Point): void;
    /**
     * Get the last anchor point.
     */
    getLastAnchor(): AnchorPoint | null;
    /**
     * Get the first anchor point.
     */
    getFirstAnchor(): AnchorPoint | null;
    /**
     * Get anchor at index.
     */
    getAnchor(index: number): AnchorPoint | null;
    /**
     * Get the number of anchors.
     */
    get anchorCount(): number;
    /**
     * Close the path.
     */
    close(): void;
    /**
     * Check if the path is closed.
     */
    get closed(): boolean;
    /**
     * Set the winding rule.
     */
    setWindingRule(rule: WindingRule): void;
    /**
     * Remove the last anchor point.
     */
    removeLastAnchor(): void;
    /**
     * Clear all anchors.
     */
    clear(): void;
    /**
     * Check if a point is near the first anchor (for closing).
     */
    isNearFirstAnchor(point: Point, threshold: number): boolean;
    /**
     * Build the final VectorPath from the current anchors.
     */
    build(): VectorPath;
    /**
     * Create a path builder from an existing VectorPath.
     */
    static fromPath(path: VectorPath): PathBuilder;
}
/**
 * Create a new path builder.
 */
export declare function createPathBuilder(): PathBuilder;
//# sourceMappingURL=path-builder.d.ts.map