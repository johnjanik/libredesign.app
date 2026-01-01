/**
 * Greiner-Hormann Algorithm
 *
 * Implements boolean operations (union, intersection, subtraction, exclusion)
 * on polygons using the Greiner-Hormann algorithm.
 */
import { Vertex, createPolygonsFromPath, polygonsToVectorPath } from './polygon';
import { lineLineIntersection, EPSILON } from './intersection';
import { markEntryExitPoints } from './classify';
import { extractContours } from './contour-builder';
import { handleDegenerateCases, isDegenerateCase } from './degenerate';
const DEFAULT_CONFIG = {
    flattenTolerance: 0.5,
    intersectionTolerance: 1e-6,
    handleDegenerates: true,
};
/**
 * Compute a boolean operation between two sets of paths.
 */
export function computeBooleanOperation(operation, subjectPaths, clipPaths, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    try {
        // Convert paths to polygons
        const subjectPolygons = [];
        for (const path of subjectPaths) {
            subjectPolygons.push(...createPolygonsFromPath(path, 'subject', cfg.flattenTolerance));
        }
        const clipPolygons = [];
        for (const path of clipPaths) {
            clipPolygons.push(...createPolygonsFromPath(path, 'clip', cfg.flattenTolerance));
        }
        if (subjectPolygons.length === 0) {
            // No subject - return clip for union, empty for others
            if (operation === 'UNION') {
                return { paths: clipPaths, success: true };
            }
            return { paths: [], success: true };
        }
        if (clipPolygons.length === 0) {
            // No clip - return subject for union/subtract, empty for intersect
            if (operation === 'UNION' || operation === 'SUBTRACT') {
                return { paths: subjectPaths, success: true };
            }
            return { paths: [], success: true };
        }
        // Process each subject polygon against all clip polygons
        const resultPolygons = [];
        for (const subject of subjectPolygons) {
            let currentResults = [subject];
            for (const clip of clipPolygons) {
                const nextResults = [];
                for (const current of currentResults) {
                    const opResults = processPolygonPair(current.clone(), clip.clone(), operation, cfg);
                    nextResults.push(...opResults);
                }
                currentResults = nextResults;
            }
            resultPolygons.push(...currentResults);
        }
        // Convert result polygons back to paths
        if (resultPolygons.length === 0) {
            return { paths: [], success: true };
        }
        const resultPath = polygonsToVectorPath(resultPolygons, subjectPaths[0]?.windingRule || 'NONZERO');
        return { paths: [resultPath], success: true };
    }
    catch (error) {
        return {
            paths: [],
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Process a single pair of polygons.
 */
function processPolygonPair(subject, clip, operation, config) {
    // Check for degenerate cases first
    if (config.handleDegenerates && isDegenerateCase(subject, clip)) {
        return handleDegenerateCases(subject, clip, operation);
    }
    // Phase 1: Find all intersections
    findAndInsertIntersections(subject, clip, config.intersectionTolerance);
    // Phase 2: Mark entry/exit points
    markEntryExitPoints(subject, clip, operation);
    // Phase 3: Extract result contours
    const contours = extractContours(subject, clip, operation);
    return contours;
}
/**
 * Find all intersections between two polygons and insert them into both.
 */
export function findAndInsertIntersections(subject, clip, tolerance = EPSILON) {
    if (!subject.first || !clip.first)
        return;
    // Collect edges before modification
    const subjectEdges = [];
    for (const [v1, v2] of subject.edges()) {
        subjectEdges.push({ v1, v2 });
    }
    const clipEdges = [];
    for (const [v1, v2] of clip.edges()) {
        clipEdges.push({ v1, v2 });
    }
    // Find intersections between all edge pairs
    for (const subjectEdge of subjectEdges) {
        for (const clipEdge of clipEdges) {
            const intersection = lineLineIntersection(subjectEdge.v1.point, subjectEdge.v2.point, clipEdge.v1.point, clipEdge.v2.point);
            if (intersection) {
                // Skip if intersection is at endpoint
                if (isAtEndpoint(intersection.t1, tolerance) ||
                    isAtEndpoint(intersection.t2, tolerance)) {
                    // Handle endpoint intersections specially
                    handleEndpointIntersection(subjectEdge, clipEdge, intersection, tolerance);
                    continue;
                }
                // Create intersection vertices for both polygons
                const subjectIntersect = new Vertex(intersection.point.x, intersection.point.y);
                subjectIntersect.isIntersection = true;
                subjectIntersect.alpha = intersection.t1;
                subjectIntersect.source = 'subject';
                const clipIntersect = new Vertex(intersection.point.x, intersection.point.y);
                clipIntersect.isIntersection = true;
                clipIntersect.alpha = intersection.t2;
                clipIntersect.source = 'clip';
                // Link the intersection vertices
                subjectIntersect.neighbor = clipIntersect;
                clipIntersect.neighbor = subjectIntersect;
                // Insert into respective polygons
                subjectEdge.v1.insertIntersection(subjectIntersect);
                clipEdge.v1.insertIntersection(clipIntersect);
            }
        }
    }
}
/**
 * Check if parameter is at an endpoint (0 or 1).
 */
function isAtEndpoint(t, tolerance) {
    return t < tolerance || t > 1 - tolerance;
}
/**
 * Handle intersection at or near edge endpoints.
 */
function handleEndpointIntersection(subjectEdge, clipEdge, intersection, tolerance) {
    // Determine which vertices are at the intersection
    let subjectVertex = null;
    let clipVertex = null;
    if (intersection.t1 < tolerance) {
        subjectVertex = subjectEdge.v1;
    }
    else if (intersection.t1 > 1 - tolerance) {
        subjectVertex = subjectEdge.v2;
    }
    if (intersection.t2 < tolerance) {
        clipVertex = clipEdge.v1;
    }
    else if (intersection.t2 > 1 - tolerance) {
        clipVertex = clipEdge.v2;
    }
    // If both are at endpoints, link them as intersection points
    if (subjectVertex && clipVertex) {
        if (!subjectVertex.isIntersection) {
            subjectVertex.isIntersection = true;
            subjectVertex.neighbor = clipVertex;
        }
        if (!clipVertex.isIntersection) {
            clipVertex.isIntersection = true;
            clipVertex.neighbor = subjectVertex;
        }
    }
    else if (subjectVertex && !clipVertex) {
        // Subject vertex on clip edge - need to insert into clip
        const clipIntersect = new Vertex(subjectVertex.point.x, subjectVertex.point.y);
        clipIntersect.isIntersection = true;
        clipIntersect.alpha = intersection.t2;
        clipIntersect.source = 'clip';
        clipIntersect.neighbor = subjectVertex;
        subjectVertex.isIntersection = true;
        subjectVertex.neighbor = clipIntersect;
        clipEdge.v1.insertIntersection(clipIntersect);
    }
    else if (!subjectVertex && clipVertex) {
        // Clip vertex on subject edge - need to insert into subject
        const subjectIntersect = new Vertex(clipVertex.point.x, clipVertex.point.y);
        subjectIntersect.isIntersection = true;
        subjectIntersect.alpha = intersection.t1;
        subjectIntersect.source = 'subject';
        subjectIntersect.neighbor = clipVertex;
        clipVertex.isIntersection = true;
        clipVertex.neighbor = subjectIntersect;
        subjectEdge.v1.insertIntersection(subjectIntersect);
    }
}
/**
 * Convenience functions for specific operations.
 */
export function union(subjectPaths, clipPaths, config) {
    return computeBooleanOperation('UNION', subjectPaths, clipPaths, config);
}
export function subtract(subjectPaths, clipPaths, config) {
    return computeBooleanOperation('SUBTRACT', subjectPaths, clipPaths, config);
}
export function intersect(subjectPaths, clipPaths, config) {
    return computeBooleanOperation('INTERSECT', subjectPaths, clipPaths, config);
}
export function exclude(subjectPaths, clipPaths, config) {
    return computeBooleanOperation('EXCLUDE', subjectPaths, clipPaths, config);
}
//# sourceMappingURL=greiner-hormann.js.map