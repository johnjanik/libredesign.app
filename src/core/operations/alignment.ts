/**
 * Alignment Operations
 *
 * Functions for aligning and distributing objects in the scene graph.
 */

import type { NodeId } from '@core/types/common';
import type { Rect } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';

/**
 * Alignment anchor options
 */
export type AlignTo = 'selection' | 'first' | 'last' | 'canvas';

/**
 * Horizontal alignment options
 */
export type HorizontalAlignment = 'left' | 'center' | 'right';

/**
 * Vertical alignment options
 */
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

/**
 * Distribution options
 */
export type DistributeMode = 'spacing' | 'centers';

/**
 * Get the bounding box of a node
 */
function getNodeBounds(sceneGraph: SceneGraph, nodeId: NodeId): Rect | null {
  const node = sceneGraph.getNode(nodeId);
  if (!node) return null;

  if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
    const n = node as { x: number; y: number; width: number; height: number };
    return { x: n.x, y: n.y, width: n.width, height: n.height };
  }

  return null;
}

/**
 * Get combined bounding box of multiple nodes
 */
function getCombinedBounds(sceneGraph: SceneGraph, nodeIds: NodeId[]): Rect | null {
  if (nodeIds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (bounds) {
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
  }

  if (minX === Infinity) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get the reference bounds for alignment based on alignTo option
 */
function getReferenceBounds(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  alignTo: AlignTo,
  canvasBounds?: Rect
): Rect | null {
  switch (alignTo) {
    case 'selection':
      return getCombinedBounds(sceneGraph, nodeIds);
    case 'first':
      return nodeIds.length > 0 ? getNodeBounds(sceneGraph, nodeIds[0]!) : null;
    case 'last':
      return nodeIds.length > 0 ? getNodeBounds(sceneGraph, nodeIds[nodeIds.length - 1]!) : null;
    case 'canvas':
      return canvasBounds ?? { x: 0, y: 0, width: 1920, height: 1080 };
    default:
      return getCombinedBounds(sceneGraph, nodeIds);
  }
}

/**
 * Align nodes horizontally
 */
export function alignHorizontal(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  alignment: HorizontalAlignment,
  alignTo: AlignTo = 'selection',
  canvasBounds?: Rect
): void {
  if (nodeIds.length < 1) return;

  const refBounds = getReferenceBounds(sceneGraph, nodeIds, alignTo, canvasBounds);
  if (!refBounds) return;

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (!bounds) continue;

    let newX: number;

    switch (alignment) {
      case 'left':
        newX = refBounds.x;
        break;
      case 'center':
        newX = refBounds.x + refBounds.width / 2 - bounds.width / 2;
        break;
      case 'right':
        newX = refBounds.x + refBounds.width - bounds.width;
        break;
    }

    sceneGraph.updateNode(nodeId, { x: newX });
  }
}

/**
 * Align nodes vertically
 */
export function alignVertical(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  alignment: VerticalAlignment,
  alignTo: AlignTo = 'selection',
  canvasBounds?: Rect
): void {
  if (nodeIds.length < 1) return;

  const refBounds = getReferenceBounds(sceneGraph, nodeIds, alignTo, canvasBounds);
  if (!refBounds) return;

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (!bounds) continue;

    let newY: number;

    switch (alignment) {
      case 'top':
        newY = refBounds.y;
        break;
      case 'middle':
        newY = refBounds.y + refBounds.height / 2 - bounds.height / 2;
        break;
      case 'bottom':
        newY = refBounds.y + refBounds.height - bounds.height;
        break;
    }

    sceneGraph.updateNode(nodeId, { y: newY });
  }
}

/**
 * Distribute nodes horizontally with equal spacing
 */
export function distributeHorizontal(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  mode: DistributeMode = 'spacing'
): void {
  if (nodeIds.length < 3) return;

  // Get bounds for all nodes and sort by x position
  const nodesWithBounds: Array<{ id: NodeId; bounds: Rect }> = [];

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (bounds) {
      nodesWithBounds.push({ id: nodeId, bounds });
    }
  }

  if (nodesWithBounds.length < 3) return;

  // Sort by x position
  nodesWithBounds.sort((a, b) => a.bounds.x - b.bounds.x);

  const first = nodesWithBounds[0]!;
  const last = nodesWithBounds[nodesWithBounds.length - 1]!;

  if (mode === 'centers') {
    // Distribute by centers
    const firstCenter = first.bounds.x + first.bounds.width / 2;
    const lastCenter = last.bounds.x + last.bounds.width / 2;
    const totalSpan = lastCenter - firstCenter;
    const spacing = totalSpan / (nodesWithBounds.length - 1);

    for (let i = 1; i < nodesWithBounds.length - 1; i++) {
      const node = nodesWithBounds[i]!;
      const targetCenter = firstCenter + spacing * i;
      const newX = targetCenter - node.bounds.width / 2;
      sceneGraph.updateNode(node.id, { x: newX });
    }
  } else {
    // Distribute with equal spacing between objects
    const totalWidth = nodesWithBounds.reduce((sum, n) => sum + n.bounds.width, 0);
    const availableSpace = (last.bounds.x + last.bounds.width) - first.bounds.x - totalWidth;
    const spacing = availableSpace / (nodesWithBounds.length - 1);

    let currentX = first.bounds.x + first.bounds.width + spacing;

    for (let i = 1; i < nodesWithBounds.length - 1; i++) {
      const node = nodesWithBounds[i]!;
      sceneGraph.updateNode(node.id, { x: currentX });
      currentX += node.bounds.width + spacing;
    }
  }
}

/**
 * Distribute nodes vertically with equal spacing
 */
export function distributeVertical(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  mode: DistributeMode = 'spacing'
): void {
  if (nodeIds.length < 3) return;

  // Get bounds for all nodes and sort by y position
  const nodesWithBounds: Array<{ id: NodeId; bounds: Rect }> = [];

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (bounds) {
      nodesWithBounds.push({ id: nodeId, bounds });
    }
  }

  if (nodesWithBounds.length < 3) return;

  // Sort by y position
  nodesWithBounds.sort((a, b) => a.bounds.y - b.bounds.y);

  const first = nodesWithBounds[0]!;
  const last = nodesWithBounds[nodesWithBounds.length - 1]!;

  if (mode === 'centers') {
    // Distribute by centers
    const firstCenter = first.bounds.y + first.bounds.height / 2;
    const lastCenter = last.bounds.y + last.bounds.height / 2;
    const totalSpan = lastCenter - firstCenter;
    const spacing = totalSpan / (nodesWithBounds.length - 1);

    for (let i = 1; i < nodesWithBounds.length - 1; i++) {
      const node = nodesWithBounds[i]!;
      const targetCenter = firstCenter + spacing * i;
      const newY = targetCenter - node.bounds.height / 2;
      sceneGraph.updateNode(node.id, { y: newY });
    }
  } else {
    // Distribute with equal spacing between objects
    const totalHeight = nodesWithBounds.reduce((sum, n) => sum + n.bounds.height, 0);
    const availableSpace = (last.bounds.y + last.bounds.height) - first.bounds.y - totalHeight;
    const spacing = availableSpace / (nodesWithBounds.length - 1);

    let currentY = first.bounds.y + first.bounds.height + spacing;

    for (let i = 1; i < nodesWithBounds.length - 1; i++) {
      const node = nodesWithBounds[i]!;
      sceneGraph.updateNode(node.id, { y: currentY });
      currentY += node.bounds.height + spacing;
    }
  }
}

/**
 * Set equal horizontal spacing between nodes
 */
export function setHorizontalSpacing(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  spacing: number
): void {
  if (nodeIds.length < 2) return;

  // Get bounds for all nodes and sort by x position
  const nodesWithBounds: Array<{ id: NodeId; bounds: Rect }> = [];

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (bounds) {
      nodesWithBounds.push({ id: nodeId, bounds });
    }
  }

  if (nodesWithBounds.length < 2) return;

  // Sort by x position
  nodesWithBounds.sort((a, b) => a.bounds.x - b.bounds.x);

  let currentX = nodesWithBounds[0]!.bounds.x + nodesWithBounds[0]!.bounds.width + spacing;

  for (let i = 1; i < nodesWithBounds.length; i++) {
    const node = nodesWithBounds[i]!;
    sceneGraph.updateNode(node.id, { x: currentX });
    currentX += node.bounds.width + spacing;
  }
}

/**
 * Set equal vertical spacing between nodes
 */
export function setVerticalSpacing(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  spacing: number
): void {
  if (nodeIds.length < 2) return;

  // Get bounds for all nodes and sort by y position
  const nodesWithBounds: Array<{ id: NodeId; bounds: Rect }> = [];

  for (const nodeId of nodeIds) {
    const bounds = getNodeBounds(sceneGraph, nodeId);
    if (bounds) {
      nodesWithBounds.push({ id: nodeId, bounds });
    }
  }

  if (nodesWithBounds.length < 2) return;

  // Sort by y position
  nodesWithBounds.sort((a, b) => a.bounds.y - b.bounds.y);

  let currentY = nodesWithBounds[0]!.bounds.y + nodesWithBounds[0]!.bounds.height + spacing;

  for (let i = 1; i < nodesWithBounds.length; i++) {
    const node = nodesWithBounds[i]!;
    sceneGraph.updateNode(node.id, { y: currentY });
    currentY += node.bounds.height + spacing;
  }
}

/**
 * Match width of all nodes to reference
 */
export function matchWidth(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  alignTo: AlignTo = 'first'
): void {
  if (nodeIds.length < 2) return;

  const refBounds = getReferenceBounds(sceneGraph, nodeIds, alignTo);
  if (!refBounds) return;

  for (const nodeId of nodeIds) {
    sceneGraph.updateNode(nodeId, { width: refBounds.width });
  }
}

/**
 * Match height of all nodes to reference
 */
export function matchHeight(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  alignTo: AlignTo = 'first'
): void {
  if (nodeIds.length < 2) return;

  const refBounds = getReferenceBounds(sceneGraph, nodeIds, alignTo);
  if (!refBounds) return;

  for (const nodeId of nodeIds) {
    sceneGraph.updateNode(nodeId, { height: refBounds.height });
  }
}

/**
 * Match both width and height of all nodes to reference
 */
export function matchSize(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  alignTo: AlignTo = 'first'
): void {
  if (nodeIds.length < 2) return;

  const refBounds = getReferenceBounds(sceneGraph, nodeIds, alignTo);
  if (!refBounds) return;

  for (const nodeId of nodeIds) {
    sceneGraph.updateNode(nodeId, { width: refBounds.width, height: refBounds.height });
  }
}
