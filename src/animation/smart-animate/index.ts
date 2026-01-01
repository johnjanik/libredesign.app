/**
 * Smart Animate Module
 *
 * Provides Smart Animate functionality for smooth transitions between frames.
 * Matches nodes, calculates property differences, and interpolates states.
 */

// Node matching
export {
  matchNodes,
  getAnimatableNodes,
} from './matcher';
export type {
  MatchConfidence,
  NodeMatch,
  MatchResult,
  MatchOptions,
} from './matcher';

// Property diffing
export {
  diffNodes,
  getAnimatableProperties,
} from './property-differ';
export type {
  AnimatablePropertyType,
  PropertyDiff,
  NodeDiff,
  DiffOptions,
} from './property-differ';

// Interpolation
export {
  interpolateFrame,
  applyInterpolation,
  createNodeInterpolator,
} from './interpolator';
export type {
  InterpolatedState,
  FrameInterpolation,
  InterpolateOptions,
} from './interpolator';

import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { EasingFunction } from '../types/easing';
import { matchNodes, getAnimatableNodes } from './matcher';
import type { MatchResult } from './matcher';
import { diffNodes } from './property-differ';
import type { NodeDiff } from './property-differ';
import { interpolateFrame } from './interpolator';
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
export function prepareSmartAnimate(
  config: SmartAnimateConfig,
  sceneGraph: SceneGraph
): SmartAnimateTransition {
  // Get all animatable nodes from both frames
  const sourceNodeList = getAnimatableNodes(config.sourceFrameId, sceneGraph);
  const targetNodeList = getAnimatableNodes(config.targetFrameId, sceneGraph);

  // Create lookup maps
  const sourceNodes = new Map<NodeId, NodeData>();
  const targetNodes = new Map<NodeId, NodeData>();

  for (const node of sourceNodeList) {
    sourceNodes.set(node.id, node);
  }
  for (const node of targetNodeList) {
    targetNodes.set(node.id, node);
  }

  // Match nodes between frames
  const matches = matchNodes(sourceNodeList, targetNodeList, sceneGraph, {
    ...(config.minMatchScore !== undefined && { minScore: config.minMatchScore }),
    ...(config.positionTolerance !== undefined && { positionTolerance: config.positionTolerance }),
  });

  // Calculate diffs for matched nodes
  const diffs: NodeDiff[] = [];
  for (const match of matches.matched) {
    const sourceNode = sourceNodes.get(match.sourceId);
    const targetNode = targetNodes.get(match.targetId);

    if (sourceNode && targetNode) {
      diffs.push(diffNodes(sourceNode, targetNode));
    }
  }

  // Create interpolation function
  const interpolate = (progress: number): FrameInterpolation => {
    return interpolateFrame(
      progress,
      diffs,
      sourceNodes,
      targetNodes,
      matches.sourceOnly,
      matches.targetOnly,
      config.easing !== undefined ? { easing: config.easing } : {}
    );
  };

  return {
    matches,
    diffs,
    sourceNodes,
    targetNodes,
    config,
    interpolate,
  };
}

/**
 * Calculate the total number of animations in a Smart Animate transition.
 */
export function countAnimations(transition: SmartAnimateTransition): {
  matched: number;
  fadeIn: number;
  fadeOut: number;
  total: number;
} {
  const matched = transition.matches.matched.length;
  const fadeIn = transition.matches.targetOnly.length;
  const fadeOut = transition.matches.sourceOnly.length;

  return {
    matched,
    fadeIn,
    fadeOut,
    total: matched + fadeIn + fadeOut,
  };
}

/**
 * Check if a transition has any animations.
 */
export function hasAnimations(transition: SmartAnimateTransition): boolean {
  return countAnimations(transition).total > 0;
}

/**
 * Get nodes that need path morphing.
 */
export function getPathMorphNodes(
  transition: SmartAnimateTransition
): NodeId[] {
  return transition.diffs
    .filter((diff) => diff.needsPathMorph)
    .map((diff) => diff.targetId);
}
