/**
 * Polygon Representation
 *
 * Doubly-linked list representation of polygons for the Greiner-Hormann algorithm.
 * Supports intersection vertex insertion and traversal.
 */
import { flattenBezier, EPSILON } from './intersection';
/**
 * Vertex in the polygon linked list.
 */
export class Vertex {
    /** Position */
    point;
    /** Next vertex in the polygon */
    next = null;
    /** Previous vertex in the polygon */
    prev = null;
    /** Corresponding vertex in the other polygon (for intersections) */
    neighbor = null;
    /** Whether this is an intersection vertex */
    isIntersection = false;
    /** Whether traversal enters the other polygon at this intersection */
    isEntry = false;
    /** Parameter along edge where intersection occurs [0, 1] */
    alpha = 0;
    /** Whether this vertex has been visited during contour extraction */
    visited = false;
    /** Source polygon identifier (for debugging) */
    source = 'subject';
    constructor(x, y) {
        this.point = { x, y };
    }
    /**
     * Create a copy of this vertex without links.
     */
    clone() {
        const v = new Vertex(this.point.x, this.point.y);
        v.isIntersection = this.isIntersection;
        v.isEntry = this.isEntry;
        v.alpha = this.alpha;
        v.source = this.source;
        return v;
    }
    /**
     * Insert a vertex after this one.
     */
    insertAfter(v) {
        v.prev = this;
        v.next = this.next;
        if (this.next) {
            this.next.prev = v;
        }
        this.next = v;
    }
    /**
     * Insert an intersection vertex between this vertex and next.
     * Maintains sorted order by alpha parameter.
     */
    insertIntersection(intersection) {
        let current = this;
        // Find the correct position based on alpha
        while (current.next &&
            current.next !== this && // Avoid infinite loop in circular list
            current.next.isIntersection &&
            current.next.alpha < intersection.alpha) {
            current = current.next;
        }
        current.insertAfter(intersection);
    }
}
/**
 * Polygon as a circular doubly-linked list of vertices.
 */
export class Polygon {
    /** First vertex in the list */
    first = null;
    /** Number of vertices */
    _count = 0;
    /** Polygon source identifier */
    source = 'subject';
    get count() {
        return this._count;
    }
    /**
     * Add a vertex to the end of the polygon.
     */
    addVertex(v) {
        v.source = this.source;
        if (!this.first) {
            this.first = v;
            v.next = v;
            v.prev = v;
        }
        else {
            // Insert before first (at end of circular list)
            const last = this.first.prev;
            last.next = v;
            v.prev = last;
            v.next = this.first;
            this.first.prev = v;
        }
        this._count++;
    }
    /**
     * Add a point as a new vertex.
     */
    addPoint(x, y) {
        const v = new Vertex(x, y);
        this.addVertex(v);
        return v;
    }
    /**
     * Iterate over all vertices.
     */
    *vertices() {
        if (!this.first)
            return;
        let current = this.first;
        do {
            yield current;
            current = current.next;
        } while (current && current !== this.first);
    }
    /**
     * Iterate over all edges (pairs of consecutive vertices).
     */
    *edges() {
        if (!this.first || this._count < 2)
            return;
        let current = this.first;
        do {
            yield [current, current.next];
            current = current.next;
        } while (current && current !== this.first);
    }
    /**
     * Iterate over non-intersection vertices (original polygon vertices).
     */
    *originalVertices() {
        for (const v of this.vertices()) {
            if (!v.isIntersection) {
                yield v;
            }
        }
    }
    /**
     * Iterate over intersection vertices only.
     */
    *intersectionVertices() {
        for (const v of this.vertices()) {
            if (v.isIntersection) {
                yield v;
            }
        }
    }
    /**
     * Find unvisited intersection vertices.
     */
    *unvisitedIntersections() {
        for (const v of this.vertices()) {
            if (v.isIntersection && !v.visited) {
                yield v;
            }
        }
    }
    /**
     * Get the next non-intersection vertex after v.
     */
    getNextOriginal(v) {
        let current = v.next;
        while (current.isIntersection && current !== v) {
            current = current.next;
        }
        return current;
    }
    /**
     * Get all points as an array.
     */
    getPoints() {
        const points = [];
        for (const v of this.vertices()) {
            points.push(v.point);
        }
        return points;
    }
    /**
     * Get original (non-intersection) points as an array.
     */
    getOriginalPoints() {
        const points = [];
        for (const v of this.originalVertices()) {
            points.push(v.point);
        }
        return points;
    }
    /**
     * Reset visited flags on all vertices.
     */
    resetVisited() {
        for (const v of this.vertices()) {
            v.visited = false;
        }
    }
    /**
     * Check if polygon has any unvisited intersections.
     */
    hasUnvisitedIntersections() {
        for (const _v of this.unvisitedIntersections()) {
            return true;
        }
        return false;
    }
    /**
     * Create a deep copy of the polygon.
     */
    clone() {
        const copy = new Polygon();
        copy.source = this.source;
        const vertexMap = new Map();
        // First pass: create all vertices
        for (const v of this.vertices()) {
            const copyV = v.clone();
            vertexMap.set(v, copyV);
        }
        // Second pass: link vertices
        for (const v of this.vertices()) {
            const copyV = vertexMap.get(v);
            if (v.next)
                copyV.next = vertexMap.get(v.next) || null;
            if (v.prev)
                copyV.prev = vertexMap.get(v.prev) || null;
            if (v.neighbor)
                copyV.neighbor = vertexMap.get(v.neighbor) || null;
        }
        copy.first = this.first ? vertexMap.get(this.first) || null : null;
        copy._count = this._count;
        return copy;
    }
}
/**
 * Create a polygon from an array of points.
 */
export function createPolygonFromPoints(points, source = 'subject') {
    const polygon = new Polygon();
    polygon.source = source;
    for (const p of points) {
        polygon.addPoint(p.x, p.y);
    }
    return polygon;
}
/**
 * Create polygons from a VectorPath.
 * Flattens bezier curves to line segments.
 */
export function createPolygonsFromPath(path, source = 'subject', flattenTolerance = 0.5) {
    const polygons = [];
    let currentPolygon = null;
    let currentPoint = { x: 0, y: 0 };
    let startPoint = { x: 0, y: 0 };
    const closeCurrentPolygon = () => {
        if (currentPolygon && currentPolygon.count >= 3) {
            polygons.push(currentPolygon);
        }
        currentPolygon = null;
    };
    for (const cmd of path.commands) {
        switch (cmd.type) {
            case 'M':
                closeCurrentPolygon();
                currentPolygon = new Polygon();
                currentPolygon.source = source;
                currentPoint = { x: cmd.x, y: cmd.y };
                startPoint = currentPoint;
                currentPolygon.addPoint(cmd.x, cmd.y);
                break;
            case 'L':
                if (currentPolygon) {
                    currentPoint = { x: cmd.x, y: cmd.y };
                    // Skip if same as previous point
                    const lastVertex = currentPolygon.first?.prev;
                    if (!lastVertex ||
                        Math.abs(lastVertex.point.x - cmd.x) > EPSILON ||
                        Math.abs(lastVertex.point.y - cmd.y) > EPSILON) {
                        currentPolygon.addPoint(cmd.x, cmd.y);
                    }
                }
                break;
            case 'C':
                if (currentPolygon) {
                    // Flatten bezier curve
                    const flatPoints = flattenBezier(currentPoint, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x2, y: cmd.y2 }, { x: cmd.x, y: cmd.y }, flattenTolerance);
                    // Skip first point (same as currentPoint)
                    for (let i = 1; i < flatPoints.length; i++) {
                        const p = flatPoints[i];
                        const lastVertex = currentPolygon.first?.prev;
                        if (!lastVertex ||
                            Math.abs(lastVertex.point.x - p.x) > EPSILON ||
                            Math.abs(lastVertex.point.y - p.y) > EPSILON) {
                            currentPolygon.addPoint(p.x, p.y);
                        }
                    }
                    currentPoint = { x: cmd.x, y: cmd.y };
                }
                break;
            case 'Z':
                if (currentPolygon) {
                    currentPoint = startPoint;
                    // Remove last point if it's the same as first
                    const first = currentPolygon.first;
                    const last = first?.prev;
                    if (first &&
                        last &&
                        last !== first &&
                        Math.abs(first.point.x - last.point.x) < EPSILON &&
                        Math.abs(first.point.y - last.point.y) < EPSILON) {
                        // Remove last vertex
                        last.prev.next = first;
                        first.prev = last.prev;
                        currentPolygon['_count']--;
                    }
                }
                closeCurrentPolygon();
                break;
        }
    }
    closeCurrentPolygon();
    return polygons;
}
/**
 * Convert a polygon back to path commands.
 */
export function polygonToPathCommands(polygon) {
    const commands = [];
    const points = polygon.getPoints();
    if (points.length === 0) {
        return commands;
    }
    commands.push({ type: 'M', x: points[0].x, y: points[0].y });
    for (let i = 1; i < points.length; i++) {
        commands.push({ type: 'L', x: points[i].x, y: points[i].y });
    }
    commands.push({ type: 'Z' });
    return commands;
}
/**
 * Convert multiple polygons to a single VectorPath.
 */
export function polygonsToVectorPath(polygons, windingRule = 'NONZERO') {
    const commands = [];
    for (const polygon of polygons) {
        commands.push(...polygonToPathCommands(polygon));
    }
    return {
        windingRule,
        commands,
    };
}
//# sourceMappingURL=polygon.js.map