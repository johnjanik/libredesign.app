/**
 * Smart Animate Node Matcher
 *
 * Matches nodes between source and target frames for Smart Animate transitions.
 * Uses multiple heuristics to find corresponding elements.
 */
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * Match confidence levels.
 */
export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low';
/**
 * A matched pair of nodes.
 */
export interface NodeMatch {
    /** Source node ID */
    readonly sourceId: NodeId;
    /** Target node ID */
    readonly targetId: NodeId;
    /** Match confidence level */
    readonly confidence: MatchConfidence;
    /** Numerical score (0-1) */
    readonly score: number;
    /** Match reason for debugging */
    readonly reason: string;
}
/**
 * Result of the matching algorithm.
 */
export interface MatchResult {
    /** Successfully matched node pairs */
    readonly matched: readonly NodeMatch[];
    /** Nodes only in source (will fade out) */
    readonly sourceOnly: readonly NodeId[];
    /** Nodes only in target (will fade in) */
    readonly targetOnly: readonly NodeId[];
}
/**
 * Options for node matching.
 */
export interface MatchOptions {
    /** Minimum score threshold for accepting a match (default: 0.3) */
    readonly minScore?: number;
    /** Whether to match by name (default: true) */
    readonly matchByName?: boolean;
    /** Whether to match by position (default: true) */
    readonly matchByPosition?: boolean;
    /** Position tolerance in pixels (default: 50) */
    readonly positionTolerance?: number;
    /** Whether to consider parent chain (default: true) */
    readonly matchByHierarchy?: boolean;
}
/**
 * Match nodes between source and target frames.
 */
export declare function matchNodes(sourceNodes: readonly NodeData[], targetNodes: readonly NodeData[], sceneGraph: SceneGraph, options?: MatchOptions): MatchResult;
/**
 * Get all animatable descendant nodes from a frame.
 */
export declare function getAnimatableNodes(frameId: NodeId, sceneGraph: SceneGraph): NodeData[];
//# sourceMappingURL=matcher.d.ts.map