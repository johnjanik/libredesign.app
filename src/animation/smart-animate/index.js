/**
 * Smart Animate Module
 *
 * Provides Smart Animate functionality for smooth transitions between frames.
 * Matches nodes, calculates property differences, and interpolates states.
 */
// Node matching
export { matchNodes, getAnimatableNodes, } from './matcher';
// Property diffing
export { diffNodes, getAnimatableProperties, } from './property-differ';
// Interpolation
export { interpolateFrame, applyInterpolation, createNodeInterpolator, } from './interpolator';
import { matchNodes, getAnimatableNodes } from './matcher';
import { diffNodes } from './property-differ';
import { interpolateFrame } from './interpolator';
/**
 * Prepare a Smart Animate transition between two frames.
 */
export function prepareSmartAnimate(config, sceneGraph) {
    // Get all animatable nodes from both frames
    const sourceNodeList = getAnimatableNodes(config.sourceFrameId, sceneGraph);
    const targetNodeList = getAnimatableNodes(config.targetFrameId, sceneGraph);
    // Create lookup maps
    const sourceNodes = new Map();
    const targetNodes = new Map();
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
    const diffs = [];
    for (const match of matches.matched) {
        const sourceNode = sourceNodes.get(match.sourceId);
        const targetNode = targetNodes.get(match.targetId);
        if (sourceNode && targetNode) {
            diffs.push(diffNodes(sourceNode, targetNode));
        }
    }
    // Create interpolation function
    const interpolate = (progress) => {
        return interpolateFrame(progress, diffs, sourceNodes, targetNodes, matches.sourceOnly, matches.targetOnly, config.easing !== undefined ? { easing: config.easing } : {});
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
export function countAnimations(transition) {
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
export function hasAnimations(transition) {
    return countAnimations(transition).total > 0;
}
/**
 * Get nodes that need path morphing.
 */
export function getPathMorphNodes(transition) {
    return transition.diffs
        .filter((diff) => diff.needsPathMorph)
        .map((diff) => diff.targetId);
}
//# sourceMappingURL=index.js.map