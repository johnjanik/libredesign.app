/**
 * Smart Animate Node Matcher
 *
 * Matches nodes between source and target frames for Smart Animate transitions.
 * Uses multiple heuristics to find corresponding elements.
 */
const DEFAULT_OPTIONS = {
    minScore: 0.3,
    matchByName: true,
    matchByPosition: true,
    positionTolerance: 50,
    matchByHierarchy: true,
};
/**
 * Match nodes between source and target frames.
 */
export function matchNodes(sourceNodes, targetNodes, sceneGraph, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    // Track which nodes have been matched
    const matchedSourceIds = new Set();
    const matchedTargetIds = new Set();
    const matches = [];
    // Create lookup maps
    const sourceById = new Map();
    const targetById = new Map();
    const sourceByName = new Map();
    const targetByName = new Map();
    for (const node of sourceNodes) {
        sourceById.set(node.id, node);
        if (node.name) {
            const list = sourceByName.get(node.name) ?? [];
            list.push(node);
            sourceByName.set(node.name, list);
        }
    }
    for (const node of targetNodes) {
        targetById.set(node.id, node);
        if (node.name) {
            const list = targetByName.get(node.name) ?? [];
            list.push(node);
            targetByName.set(node.name, list);
        }
    }
    // Pass 1: Exact ID matches
    for (const sourceNode of sourceNodes) {
        const targetNode = targetById.get(sourceNode.id);
        if (targetNode && !matchedTargetIds.has(targetNode.id)) {
            matches.push({
                sourceId: sourceNode.id,
                targetId: targetNode.id,
                confidence: 'exact',
                score: 1.0,
                reason: 'Same node ID',
            });
            matchedSourceIds.add(sourceNode.id);
            matchedTargetIds.add(targetNode.id);
        }
    }
    // Pass 2: Name matches with same type
    if (opts.matchByName) {
        for (const sourceNode of sourceNodes) {
            if (matchedSourceIds.has(sourceNode.id))
                continue;
            if (!sourceNode.name)
                continue;
            const candidates = targetByName.get(sourceNode.name);
            if (!candidates)
                continue;
            // Find best unmatched candidate of same type
            let bestMatch = null;
            for (const candidate of candidates) {
                if (matchedTargetIds.has(candidate.id))
                    continue;
                if (candidate.type !== sourceNode.type)
                    continue;
                const score = calculateNameMatchScore(sourceNode, candidate, sceneGraph, opts);
                if (score > opts.minScore && (!bestMatch || score > bestMatch.score)) {
                    bestMatch = { node: candidate, score };
                }
            }
            if (bestMatch) {
                matches.push({
                    sourceId: sourceNode.id,
                    targetId: bestMatch.node.id,
                    confidence: bestMatch.score > 0.8 ? 'high' : 'medium',
                    score: bestMatch.score,
                    reason: `Same name: "${sourceNode.name}"`,
                });
                matchedSourceIds.add(sourceNode.id);
                matchedTargetIds.add(bestMatch.node.id);
            }
        }
    }
    // Pass 3: Type + position heuristic
    if (opts.matchByPosition) {
        for (const sourceNode of sourceNodes) {
            if (matchedSourceIds.has(sourceNode.id))
                continue;
            let bestMatch = null;
            for (const targetNode of targetNodes) {
                if (matchedTargetIds.has(targetNode.id))
                    continue;
                if (targetNode.type !== sourceNode.type)
                    continue;
                const score = calculatePositionMatchScore(sourceNode, targetNode, sceneGraph, opts);
                if (score > opts.minScore && (!bestMatch || score > bestMatch.score)) {
                    bestMatch = { node: targetNode, score };
                }
            }
            if (bestMatch) {
                matches.push({
                    sourceId: sourceNode.id,
                    targetId: bestMatch.node.id,
                    confidence: bestMatch.score > 0.6 ? 'medium' : 'low',
                    score: bestMatch.score,
                    reason: 'Type and position similarity',
                });
                matchedSourceIds.add(sourceNode.id);
                matchedTargetIds.add(bestMatch.node.id);
            }
        }
    }
    // Collect unmatched nodes
    const sourceOnly = sourceNodes
        .filter((n) => !matchedSourceIds.has(n.id))
        .map((n) => n.id);
    const targetOnly = targetNodes
        .filter((n) => !matchedTargetIds.has(n.id))
        .map((n) => n.id);
    return {
        matched: matches,
        sourceOnly,
        targetOnly,
    };
}
/**
 * Calculate match score based on name and other factors.
 */
function calculateNameMatchScore(source, target, sceneGraph, opts) {
    let score = 0.7; // Base score for same name + type
    // Bonus for similar position
    if (opts.matchByPosition && 'x' in source && 'x' in target) {
        const posScore = calculatePositionSimilarity(source, target, opts.positionTolerance);
        score += posScore * 0.15;
    }
    // Bonus for similar hierarchy
    if (opts.matchByHierarchy) {
        const hierScore = calculateHierarchySimilarity(source, target, sceneGraph);
        score += hierScore * 0.15;
    }
    return Math.min(score, 1);
}
/**
 * Calculate match score based on position similarity.
 */
function calculatePositionMatchScore(source, target, sceneGraph, opts) {
    if (!('x' in source) || !('x' in target)) {
        return 0;
    }
    const sourcePos = source;
    const targetPos = target;
    // Position similarity is the primary factor
    const posScore = calculatePositionSimilarity(sourcePos, targetPos, opts.positionTolerance);
    // Must meet minimum position threshold
    if (posScore < 0.3)
        return 0;
    let score = posScore * 0.6;
    // Size similarity bonus
    if ('width' in source && 'width' in target) {
        const sizeScore = calculateSizeSimilarity(source, target);
        score += sizeScore * 0.25;
    }
    // Hierarchy similarity bonus
    if (opts.matchByHierarchy) {
        const hierScore = calculateHierarchySimilarity(source, target, sceneGraph);
        score += hierScore * 0.15;
    }
    return Math.min(score, 1);
}
/**
 * Calculate position similarity (0-1).
 */
function calculatePositionSimilarity(source, target, tolerance) {
    const dx = Math.abs(source.x - target.x);
    const dy = Math.abs(source.y - target.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= tolerance * 0.1)
        return 1;
    if (distance >= tolerance)
        return 0;
    // Smooth falloff
    return 1 - Math.pow(distance / tolerance, 0.5);
}
/**
 * Calculate size similarity (0-1).
 */
function calculateSizeSimilarity(source, target) {
    const widthRatio = Math.min(source.width, target.width) /
        Math.max(source.width, target.width, 1);
    const heightRatio = Math.min(source.height, target.height) /
        Math.max(source.height, target.height, 1);
    return (widthRatio + heightRatio) / 2;
}
/**
 * Calculate hierarchy similarity (0-1) based on parent chain.
 */
function calculateHierarchySimilarity(source, target, sceneGraph) {
    const sourceChain = getParentNames(source.id, sceneGraph);
    const targetChain = getParentNames(target.id, sceneGraph);
    if (sourceChain.length === 0 && targetChain.length === 0) {
        return 1;
    }
    // Count matching parent names (in order)
    let matches = 0;
    const minLength = Math.min(sourceChain.length, targetChain.length);
    for (let i = 0; i < minLength; i++) {
        if (sourceChain[i] === targetChain[i]) {
            matches++;
        }
        else {
            break; // Stop at first mismatch
        }
    }
    if (minLength === 0)
        return 0.5;
    return matches / minLength;
}
/**
 * Get parent names up to root.
 */
function getParentNames(nodeId, sceneGraph) {
    const names = [];
    let currentId = nodeId;
    let depth = 0;
    const maxDepth = 10;
    while (currentId && depth < maxDepth) {
        const node = sceneGraph.getNode(currentId);
        if (!node || !('parentId' in node))
            break;
        const parentId = node.parentId;
        if (!parentId)
            break;
        const parent = sceneGraph.getNode(parentId);
        if (parent && parent.name) {
            names.push(parent.name);
        }
        currentId = parentId;
        depth++;
    }
    return names;
}
/**
 * Get all animatable descendant nodes from a frame.
 */
export function getAnimatableNodes(frameId, sceneGraph) {
    const nodes = [];
    const visited = new Set();
    function collectNodes(nodeId) {
        if (visited.has(nodeId))
            return;
        visited.add(nodeId);
        const node = sceneGraph.getNode(nodeId);
        if (!node)
            return;
        // Add this node if it's animatable
        if (isAnimatableNode(node)) {
            nodes.push(node);
        }
        // Recurse into children
        const children = sceneGraph.getChildren(nodeId);
        for (const child of children) {
            collectNodes(child.id);
        }
    }
    collectNodes(frameId);
    return nodes;
}
/**
 * Check if a node type is animatable.
 */
function isAnimatableNode(node) {
    // Most node types are animatable
    const nonAnimatableTypes = new Set([
        'DOCUMENT',
        'PAGE',
        'SLICE',
        'CONNECTOR',
    ]);
    return !nonAnimatableTypes.has(node.type);
}
//# sourceMappingURL=matcher.js.map