/**
 * Smart Animate Interpolator
 *
 * Interpolates between source and target node states during Smart Animate.
 * Handles different property types with appropriate interpolation methods.
 */
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { EasingFunction } from '../types/easing';
import type { NodeDiff } from './property-differ';
/**
 * Interpolated node state at a point in time.
 */
export interface InterpolatedState {
    /** Node ID */
    readonly nodeId: NodeId;
    /** Interpolated property values */
    readonly values: Record<string, unknown>;
    /** Current opacity (for fade in/out) */
    readonly opacity: number;
    /** Whether node is fading in */
    readonly fadingIn: boolean;
    /** Whether node is fading out */
    readonly fadingOut: boolean;
}
/**
 * All interpolated states for a frame.
 */
export interface FrameInterpolation {
    /** States for matched nodes */
    readonly matched: readonly InterpolatedState[];
    /** States for fade-out nodes (source only) */
    readonly fadeOut: readonly InterpolatedState[];
    /** States for fade-in nodes (target only) */
    readonly fadeIn: readonly InterpolatedState[];
}
/**
 * Options for interpolation.
 */
export interface InterpolateOptions {
    /** Easing function to apply */
    readonly easing?: EasingFunction;
    /** Duration for fade in/out (0-1 portion of animation) */
    readonly fadeDuration?: number;
}
/**
 * Interpolate all node states for a given progress value.
 */
export declare function interpolateFrame(progress: number, diffs: readonly NodeDiff[], sourceNodes: Map<NodeId, NodeData>, targetNodes: Map<NodeId, NodeData>, fadeOutIds: readonly NodeId[], fadeInIds: readonly NodeId[], options?: InterpolateOptions): FrameInterpolation;
/**
 * Apply interpolated values to a node.
 * Returns a new node data object with the interpolated values.
 */
export declare function applyInterpolation(baseNode: NodeData, state: InterpolatedState): NodeData;
/**
 * Create an interpolation function for a specific node pair.
 */
export declare function createNodeInterpolator(diff: NodeDiff, sourceNode: NodeData, easing?: EasingFunction): (t: number) => InterpolatedState;
//# sourceMappingURL=interpolator.d.ts.map