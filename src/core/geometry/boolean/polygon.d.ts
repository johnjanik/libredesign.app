/**
 * Polygon Representation
 *
 * Doubly-linked list representation of polygons for the Greiner-Hormann algorithm.
 * Supports intersection vertex insertion and traversal.
 */
import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
/**
 * Vertex in the polygon linked list.
 */
export declare class Vertex {
    /** Position */
    point: Point;
    /** Next vertex in the polygon */
    next: Vertex | null;
    /** Previous vertex in the polygon */
    prev: Vertex | null;
    /** Corresponding vertex in the other polygon (for intersections) */
    neighbor: Vertex | null;
    /** Whether this is an intersection vertex */
    isIntersection: boolean;
    /** Whether traversal enters the other polygon at this intersection */
    isEntry: boolean;
    /** Parameter along edge where intersection occurs [0, 1] */
    alpha: number;
    /** Whether this vertex has been visited during contour extraction */
    visited: boolean;
    /** Source polygon identifier (for debugging) */
    source: 'subject' | 'clip';
    constructor(x: number, y: number);
    /**
     * Create a copy of this vertex without links.
     */
    clone(): Vertex;
    /**
     * Insert a vertex after this one.
     */
    insertAfter(v: Vertex): void;
    /**
     * Insert an intersection vertex between this vertex and next.
     * Maintains sorted order by alpha parameter.
     */
    insertIntersection(intersection: Vertex): void;
}
/**
 * Polygon as a circular doubly-linked list of vertices.
 */
export declare class Polygon {
    /** First vertex in the list */
    first: Vertex | null;
    /** Number of vertices */
    private _count;
    /** Polygon source identifier */
    source: 'subject' | 'clip';
    get count(): number;
    /**
     * Add a vertex to the end of the polygon.
     */
    addVertex(v: Vertex): void;
    /**
     * Add a point as a new vertex.
     */
    addPoint(x: number, y: number): Vertex;
    /**
     * Iterate over all vertices.
     */
    vertices(): Generator<Vertex>;
    /**
     * Iterate over all edges (pairs of consecutive vertices).
     */
    edges(): Generator<[Vertex, Vertex]>;
    /**
     * Iterate over non-intersection vertices (original polygon vertices).
     */
    originalVertices(): Generator<Vertex>;
    /**
     * Iterate over intersection vertices only.
     */
    intersectionVertices(): Generator<Vertex>;
    /**
     * Find unvisited intersection vertices.
     */
    unvisitedIntersections(): Generator<Vertex>;
    /**
     * Get the next non-intersection vertex after v.
     */
    getNextOriginal(v: Vertex): Vertex;
    /**
     * Get all points as an array.
     */
    getPoints(): Point[];
    /**
     * Get original (non-intersection) points as an array.
     */
    getOriginalPoints(): Point[];
    /**
     * Reset visited flags on all vertices.
     */
    resetVisited(): void;
    /**
     * Check if polygon has any unvisited intersections.
     */
    hasUnvisitedIntersections(): boolean;
    /**
     * Create a deep copy of the polygon.
     */
    clone(): Polygon;
}
/**
 * Create a polygon from an array of points.
 */
export declare function createPolygonFromPoints(points: readonly Point[], source?: 'subject' | 'clip'): Polygon;
/**
 * Create polygons from a VectorPath.
 * Flattens bezier curves to line segments.
 */
export declare function createPolygonsFromPath(path: VectorPath, source?: 'subject' | 'clip', flattenTolerance?: number): Polygon[];
/**
 * Convert a polygon back to path commands.
 */
export declare function polygonToPathCommands(polygon: Polygon): PathCommand[];
/**
 * Convert multiple polygons to a single VectorPath.
 */
export declare function polygonsToVectorPath(polygons: Polygon[], windingRule?: 'NONZERO' | 'EVENODD'): VectorPath;
//# sourceMappingURL=polygon.d.ts.map