/**
 * Property Differ
 *
 * Calculates property differences between matched nodes for Smart Animate.
 * Determines which properties changed and how to interpolate them.
 */
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
/**
 * Types of properties that can be animated.
 */
export type AnimatablePropertyType = 'number' | 'point' | 'color' | 'path' | 'transform' | 'opacity' | 'size';
/**
 * A single property difference.
 */
export interface PropertyDiff<T = unknown> {
    /** Property path (e.g., 'x', 'fill.color') */
    readonly path: string;
    /** Property type */
    readonly type: AnimatablePropertyType;
    /** Source value */
    readonly from: T;
    /** Target value */
    readonly to: T;
    /** Whether values are significantly different */
    readonly significant: boolean;
}
/**
 * All property differences between two nodes.
 */
export interface NodeDiff {
    /** Source node ID */
    readonly sourceId: NodeId;
    /** Target node ID */
    readonly targetId: NodeId;
    /** Property differences */
    readonly properties: readonly PropertyDiff[];
    /** Whether the node has significant changes */
    readonly hasChanges: boolean;
    /** Whether path morphing is needed */
    readonly needsPathMorph: boolean;
}
/**
 * Options for diffing.
 */
export interface DiffOptions {
    /** Threshold for considering number changes significant */
    readonly numberThreshold?: number;
    /** Threshold for considering color changes significant (0-255) */
    readonly colorThreshold?: number;
    /** Whether to diff path data */
    readonly diffPaths?: boolean;
}
/**
 * Calculate differences between two matched nodes.
 */
export declare function diffNodes(sourceNode: NodeData, targetNode: NodeData, options?: DiffOptions): NodeDiff;
/**
 * Get a list of all animatable property paths.
 */
export declare function getAnimatableProperties(): readonly string[];
//# sourceMappingURL=property-differ.d.ts.map