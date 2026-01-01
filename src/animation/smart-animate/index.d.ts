/**
 * Smart Animate Module
 *
 * Provides Smart Animate functionality for smooth transitions between frames.
 * Matches nodes, calculates property differences, and interpolates states.
 */
export { matchNodes, getAnimatableNodes, } from './matcher';
export type { MatchConfidence, NodeMatch, MatchResult, MatchOptions, } from './matcher';
export { diffNodes, getAnimatableProperties, } from './property-differ';
export type { AnimatablePropertyType, PropertyDiff, NodeDiff, DiffOptions, } from './property-differ';
export { interpolateFrame, applyInterpolation, createNodeInterpolator, } from './interpolator';
export type { InterpolatedState, FrameInterpolation, InterpolateOptions, } from './interpolator';
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { EasingFunction } from '../types/easing';
import type { MatchResult } from './matcher';
import type { NodeDiff } from './property-differ';
import type { FrameInterpolation } from './interpolator';
/**
 * Smart Animate configuration.
 */
export interface SmartAnimateConfig {
    /** Source frame ID */
    readonly sourceFrameId: NodeId;
    /** Target frame ID */
    readonly targetFrameId: NodeId;
    /** Animation duration in ms */
    readonly duration: number;
    /** Easing function */
    readonly easing?: EasingFunction;
    /** Minimum match score */
    readonly minMatchScore?: number;
    /** Position tolerance for matching */
    readonly positionTolerance?: number;
}
/**
 * Prepared Smart Animate transition.
 */
export interface SmartAnimateTransition {
    /** Matching results */
    readonly matches: MatchResult;
    /** Property diffs for matched nodes */
    readonly diffs: readonly NodeDiff[];
    /** Source nodes map */
    readonly sourceNodes: Map<NodeId, NodeData>;
    /** Target nodes map */
    readonly targetNodes: Map<NodeId, NodeData>;
    /** Configuration */
    readonly config: SmartAnimateConfig;
    /** Get interpolated frame at progress (0-1) */
    interpolate(progress: number): FrameInterpolation;
}
/**
 * Prepare a Smart Animate transition between two frames.
 */
export declare function prepareSmartAnimate(config: SmartAnimateConfig, sceneGraph: SceneGraph): SmartAnimateTransition;
/**
 * Calculate the total number of animations in a Smart Animate transition.
 */
export declare function countAnimations(transition: SmartAnimateTransition): {
    matched: number;
    fadeIn: number;
    fadeOut: number;
    total: number;
};
/**
 * Check if a transition has any animations.
 */
export declare function hasAnimations(transition: SmartAnimateTransition): boolean;
/**
 * Get nodes that need path morphing.
 */
export declare function getPathMorphNodes(transition: SmartAnimateTransition): NodeId[];
//# sourceMappingURL=index.d.ts.map