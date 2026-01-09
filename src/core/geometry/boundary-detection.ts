/**
 * Boundary Detection Algorithm
 *
 * Detects closed regions from a set of line segments.
 * Used for automatic hatch boundary detection.
 *
 * Algorithm:
 * 1. Build a graph of connected line segments
 * 2. Find all cycles (closed loops) in the graph
 * 3. Return the smallest enclosing boundary for a given point
 */

import type { Point } from '@core/types/geometry';

/**
 * Line segment for boundary detection
 */
export interface BoundarySegment {
  readonly id: string;
  readonly start: Point;
  readonly end: Point;
}

/**
 * Detected boundary (closed region)
 */
export interface DetectedBoundary {
  readonly points: Point[];
  readonly segmentIds: string[];
  readonly area: number;
  readonly isClockwise: boolean;
}

/**
 * Configuration for boundary detection
 */
export interface BoundaryDetectionConfig {
  /** Tolerance for point matching (pixels) */
  readonly tolerance: number;
  /** Maximum cycle length to search for */
  readonly maxCycleLength: number;
  /** Whether to sort boundaries by area */
  readonly sortByArea: boolean;
}

const DEFAULT_CONFIG: BoundaryDetectionConfig = {
  tolerance: 5,
  maxCycleLength: 100,
  sortByArea: true,
};

/**
 * Graph node for boundary detection
 */
interface GraphNode {
  point: Point;
  edges: Edge[];
}

/**
 * Graph edge
 */
interface Edge {
  segmentId: string;
  targetIndex: number;
  targetPoint: Point;
}

/**
 * Boundary detector class
 */
export class BoundaryDetector {
  private config: BoundaryDetectionConfig;
  private nodes: GraphNode[] = [];
  private pointToNode: Map<string, number> = new Map();

  constructor(config: Partial<BoundaryDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build the graph from line segments.
   */
  buildGraph(segments: BoundarySegment[]): void {
    this.nodes = [];
    this.pointToNode.clear();

    for (const segment of segments) {
      const startIdx = this.getOrCreateNode(segment.start);
      const endIdx = this.getOrCreateNode(segment.end);

      // Add bidirectional edges
      this.nodes[startIdx]!.edges.push({
        segmentId: segment.id,
        targetIndex: endIdx,
        targetPoint: segment.end,
      });

      this.nodes[endIdx]!.edges.push({
        segmentId: segment.id,
        targetIndex: startIdx,
        targetPoint: segment.start,
      });
    }
  }

  /**
   * Find all closed boundaries.
   */
  findAllBoundaries(): DetectedBoundary[] {
    const boundaries: DetectedBoundary[] = [];
    const visitedEdges = new Set<string>();

    for (let startNode = 0; startNode < this.nodes.length; startNode++) {
      const cycles = this.findCyclesFromNode(startNode, visitedEdges);
      boundaries.push(...cycles);
    }

    // Remove duplicate boundaries
    const uniqueBoundaries = this.removeDuplicates(boundaries);

    // Sort by area if configured
    if (this.config.sortByArea) {
      uniqueBoundaries.sort((a, b) => a.area - b.area);
    }

    return uniqueBoundaries;
  }

  /**
   * Find the smallest boundary containing a point.
   */
  findBoundaryAtPoint(point: Point, segments: BoundarySegment[]): DetectedBoundary | null {
    this.buildGraph(segments);
    const boundaries = this.findAllBoundaries();

    // Find smallest boundary containing the point
    for (const boundary of boundaries) {
      if (this.isPointInPolygon(point, boundary.points)) {
        return boundary;
      }
    }

    return null;
  }

  /**
   * Find cycles starting from a specific node.
   */
  private findCyclesFromNode(startNode: number, globalVisited: Set<string>): DetectedBoundary[] {
    const cycles: DetectedBoundary[] = [];
    const node = this.nodes[startNode]!;

    for (const startEdge of node.edges) {
      const edgeKey = this.edgeKey(startNode, startEdge.targetIndex, startEdge.segmentId);
      if (globalVisited.has(edgeKey)) continue;

      const cycle = this.traceCycle(startNode, startEdge, globalVisited);
      if (cycle) {
        cycles.push(cycle);
      }
    }

    return cycles;
  }

  /**
   * Trace a cycle using the right-hand rule (always turn right).
   */
  private traceCycle(
    startNodeIdx: number,
    startEdge: Edge,
    globalVisited: Set<string>
  ): DetectedBoundary | null {
    const points: Point[] = [this.nodes[startNodeIdx]!.point];
    const segmentIds: string[] = [];
    const localVisited = new Set<string>();

    let currentNode = startNodeIdx;
    let currentEdge = startEdge;
    let prevAngle = this.edgeAngle(this.nodes[startNodeIdx]!.point, startEdge.targetPoint);

    for (let i = 0; i < this.config.maxCycleLength; i++) {
      const edgeKey = this.edgeKey(currentNode, currentEdge.targetIndex, currentEdge.segmentId);

      if (localVisited.has(edgeKey)) {
        // Found a loop but might not be back at start
        break;
      }

      localVisited.add(edgeKey);
      segmentIds.push(currentEdge.segmentId);

      const nextNodeIdx = currentEdge.targetIndex;
      const nextNode = this.nodes[nextNodeIdx]!;
      points.push(nextNode.point);

      // Check if we're back at the start
      if (nextNodeIdx === startNodeIdx && points.length > 3) {
        // Found complete cycle
        points.pop(); // Remove duplicate start point

        // Mark edges as globally visited
        for (const key of localVisited) {
          globalVisited.add(key);
        }

        const area = this.calculateArea(points);
        const isClockwise = area < 0;

        return {
          points,
          segmentIds,
          area: Math.abs(area),
          isClockwise,
        };
      }

      // Find next edge using right-hand rule
      const nextEdge = this.findRightmostEdge(nextNode, currentNode, prevAngle + Math.PI);

      if (!nextEdge) {
        // Dead end
        break;
      }

      prevAngle = this.edgeAngle(nextNode.point, nextEdge.targetPoint);
      currentNode = nextNodeIdx;
      currentEdge = nextEdge;
    }

    return null;
  }

  /**
   * Find the rightmost edge (smallest clockwise angle from incoming direction).
   */
  private findRightmostEdge(node: GraphNode, fromNodeIdx: number, incomingAngle: number): Edge | null {
    let bestEdge: Edge | null = null;
    let bestAngleDiff = Infinity;

    for (const edge of node.edges) {
      // Skip edge going back to where we came from
      if (edge.targetIndex === fromNodeIdx) continue;

      const outgoingAngle = this.edgeAngle(node.point, edge.targetPoint);
      let angleDiff = outgoingAngle - incomingAngle;

      // Normalize to [0, 2π)
      while (angleDiff < 0) angleDiff += Math.PI * 2;
      while (angleDiff >= Math.PI * 2) angleDiff -= Math.PI * 2;

      // We want smallest positive angle (rightmost turn)
      if (angleDiff < bestAngleDiff) {
        bestAngleDiff = angleDiff;
        bestEdge = edge;
      }
    }

    return bestEdge;
  }

  /**
   * Calculate angle of edge from start to end.
   */
  private edgeAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
  }

  /**
   * Create a unique key for an edge.
   */
  private edgeKey(fromIdx: number, toIdx: number, segmentId: string): string {
    return `${fromIdx}-${toIdx}-${segmentId}`;
  }

  /**
   * Get or create a node for a point.
   */
  private getOrCreateNode(point: Point): number {
    // Snap to tolerance grid for matching
    const key = this.pointKey(point);
    const existing = this.pointToNode.get(key);

    if (existing !== undefined) {
      return existing;
    }

    // Check for nearby points within tolerance
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.pointsMatch(point, this.nodes[i]!.point)) {
        this.pointToNode.set(key, i);
        return i;
      }
    }

    // Create new node
    const idx = this.nodes.length;
    this.nodes.push({
      point,
      edges: [],
    });
    this.pointToNode.set(key, idx);

    return idx;
  }

  /**
   * Create a key for a point (for Map lookup).
   */
  private pointKey(point: Point): string {
    const gridSize = this.config.tolerance;
    const gx = Math.round(point.x / gridSize);
    const gy = Math.round(point.y / gridSize);
    return `${gx},${gy}`;
  }

  /**
   * Check if two points are within tolerance.
   */
  private pointsMatch(p1: Point, p2: Point): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.config.tolerance;
  }

  /**
   * Calculate signed area of a polygon (positive = counter-clockwise).
   */
  private calculateArea(points: Point[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i]!.x * points[j]!.y;
      area -= points[j]!.x * points[i]!.y;
    }

    return area / 2;
  }

  /**
   * Check if a point is inside a polygon.
   */
  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pi = polygon[i]!;
      const pj = polygon[j]!;

      if (((pi.y > point.y) !== (pj.y > point.y)) &&
          (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Remove duplicate boundaries (same set of points).
   */
  private removeDuplicates(boundaries: DetectedBoundary[]): DetectedBoundary[] {
    const unique: DetectedBoundary[] = [];
    const seen = new Set<string>();

    for (const boundary of boundaries) {
      const key = this.boundaryKey(boundary);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(boundary);
      }
    }

    return unique;
  }

  /**
   * Create a normalized key for a boundary.
   */
  private boundaryKey(boundary: DetectedBoundary): string {
    // Sort segment IDs and join
    const sortedIds = [...boundary.segmentIds].sort();
    return sortedIds.join(',');
  }
}

/**
 * Create a boundary detector instance.
 */
export function createBoundaryDetector(config?: Partial<BoundaryDetectionConfig>): BoundaryDetector {
  return new BoundaryDetector(config);
}

/**
 * Quick utility to find boundary at point from segments.
 */
export function detectBoundaryAtPoint(
  point: Point,
  segments: BoundarySegment[],
  config?: Partial<BoundaryDetectionConfig>
): DetectedBoundary | null {
  const detector = new BoundaryDetector(config);
  return detector.findBoundaryAtPoint(point, segments);
}

/**
 * Convert scene graph lines to boundary segments.
 */
export function linesToBoundarySegments(
  lines: Array<{
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>
): BoundarySegment[] {
  return lines.map(line => ({
    id: line.id,
    start: { x: line.x1, y: line.y1 },
    end: { x: line.x2, y: line.y2 },
  }));
}

/**
 * Convert rectangles to boundary segments.
 */
export function rectToBoundarySegments(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): BoundarySegment[] {
  return [
    { id: `${id}-top`, start: { x, y }, end: { x: x + width, y } },
    { id: `${id}-right`, start: { x: x + width, y }, end: { x: x + width, y: y + height } },
    { id: `${id}-bottom`, start: { x: x + width, y: y + height }, end: { x, y: y + height } },
    { id: `${id}-left`, start: { x, y: y + height }, end: { x, y } },
  ];
}

/**
 * Convert polygon points to boundary segments.
 */
export function polygonToBoundarySegments(id: string, points: Point[]): BoundarySegment[] {
  if (points.length < 3) return [];

  const segments: BoundarySegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    segments.push({
      id: `${id}-edge-${i}`,
      start: points[i]!,
      end: points[next]!,
    });
  }

  return segments;
}
