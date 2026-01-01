/**
 * Contour Builder
 *
 * Extracts result contours by traversing intersection vertices
 * according to the Greiner-Hormann algorithm.
 */

import type { Point } from '@core/types/geometry';
import { Polygon, Vertex, createPolygonFromPoints } from './polygon';
import { classifyPoint } from './classify';
import { EPSILON } from './intersection';

/**
 * Extract result contours from marked polygons.
 */
export function extractContours(
  subject: Polygon,
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  const results: Polygon[] = [];

  // Reset visited flags
  subject.resetVisited();
  clip.resetVisited();

  // Check if there are any intersections
  const hasIntersections = hasAnyIntersections(subject) || hasAnyIntersections(clip);

  if (!hasIntersections) {
    // No intersections - handle special cases
    return handleNoIntersections(subject, clip, operation);
  }

  // Extract contours starting from unvisited intersection vertices
  let maxIterations = 10000; // Safety limit

  while (maxIterations-- > 0) {
    // Find an unvisited entry intersection
    const startVertex = findUnvisitedEntryIntersection(subject, clip);

    if (!startVertex) {
      break;
    }

    // Extract a contour starting from this vertex
    const contour = extractSingleContour(startVertex);

    if (contour && contour.count >= 3) {
      results.push(contour);
    }
  }

  return results;
}

/**
 * Check if a polygon has any intersection vertices.
 */
function hasAnyIntersections(polygon: Polygon): boolean {
  for (const v of polygon.vertices()) {
    if (v.isIntersection) {
      return true;
    }
  }
  return false;
}

/**
 * Find an unvisited entry intersection vertex.
 */
function findUnvisitedEntryIntersection(
  subject: Polygon,
  clip: Polygon
): Vertex | null {
  // Look in subject first
  for (const v of subject.unvisitedIntersections()) {
    if (v.isEntry) {
      return v;
    }
  }

  // Then in clip
  for (const v of clip.unvisitedIntersections()) {
    if (v.isEntry) {
      return v;
    }
  }

  return null;
}

/**
 * Extract a single contour starting from a vertex.
 */
function extractSingleContour(start: Vertex): Polygon | null {
  const points: Point[] = [];
  let current: Vertex | null = start;
  let onSubject = start.source === 'subject';
  let maxSteps = 10000;

  while (current && maxSteps-- > 0) {
    // Mark as visited
    current.visited = true;
    if (current.neighbor) {
      current.neighbor.visited = true;
    }

    // Add current point
    points.push({ ...current.point });

    // Move to next vertex
    if (current.isIntersection && current.isEntry) {
      // At an entry point - switch polygons
      if (current.neighbor) {
        onSubject = !onSubject;
        current = current.neighbor.next;
      } else {
        current = current.next;
      }
    } else if (current.isIntersection && !current.isEntry) {
      // At an exit point - switch polygons
      if (current.neighbor) {
        onSubject = !onSubject;
        current = current.neighbor.next;
      } else {
        current = current.next;
      }
    } else {
      // Regular vertex - continue along current polygon
      current = current.next;
    }

    // Check if we're back at the start
    if (current === start) {
      break;
    }

    // Also check if we've reached the start point
    if (
      current &&
      Math.abs(current.point.x - start.point.x) < EPSILON &&
      Math.abs(current.point.y - start.point.y) < EPSILON
    ) {
      break;
    }
  }

  if (points.length < 3) {
    return null;
  }

  return createPolygonFromPoints(points);
}

/**
 * Handle the case when there are no intersections.
 */
function handleNoIntersections(
  subject: Polygon,
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  // Check if subject is inside clip or vice versa
  const subjectInClip = isPolygonInsidePolygon(subject, clip);
  const clipInSubject = isPolygonInsidePolygon(clip, subject);

  switch (operation) {
    case 'UNION':
      if (subjectInClip) {
        // Subject is inside clip - return clip only
        return [clip.clone()];
      }
      if (clipInSubject) {
        // Clip is inside subject - return subject only
        return [subject.clone()];
      }
      // Disjoint - return both
      return [subject.clone(), clip.clone()];

    case 'INTERSECT':
      if (subjectInClip) {
        // Subject is inside clip - return subject
        return [subject.clone()];
      }
      if (clipInSubject) {
        // Clip is inside subject - return clip
        return [clip.clone()];
      }
      // Disjoint - return empty
      return [];

    case 'SUBTRACT':
      if (subjectInClip) {
        // Subject is inside clip - return empty
        return [];
      }
      if (clipInSubject) {
        // Clip is inside subject - return subject with hole
        // (Would need to handle holes properly)
        return [subject.clone()];
      }
      // Disjoint - return subject
      return [subject.clone()];

    case 'EXCLUDE':
      if (subjectInClip) {
        // Return clip minus subject (need to handle)
        return [subject.clone(), clip.clone()];
      }
      if (clipInSubject) {
        // Return subject minus clip (need to handle)
        return [subject.clone(), clip.clone()];
      }
      // Disjoint - return both
      return [subject.clone(), clip.clone()];

    default:
      return [];
  }
}

/**
 * Check if polygon A is entirely inside polygon B.
 */
function isPolygonInsidePolygon(inner: Polygon, outer: Polygon): boolean {
  if (!inner.first) return false;

  // Check if the first vertex of inner is inside outer
  const firstVertex = inner.first;
  const classification = classifyPoint(firstVertex.point, outer);

  return classification === 'inside';
}

/**
 * Alternative contour extraction using forward/backward traversal.
 * Used when the simple traversal doesn't produce correct results.
 */
export function extractContoursAlternative(
  subject: Polygon,
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  const results: Polygon[] = [];

  subject.resetVisited();
  clip.resetVisited();

  // For each unvisited intersection, try to build a contour
  let maxContours = 100;

  while (maxContours-- > 0) {
    const start = findUnvisitedIntersection(subject, clip);
    if (!start) break;

    const contour = extractContourByDirection(start, operation);
    if (contour && contour.count >= 3) {
      results.push(contour);
    }
  }

  return results;
}

/**
 * Find any unvisited intersection vertex.
 */
function findUnvisitedIntersection(subject: Polygon, clip: Polygon): Vertex | null {
  for (const v of subject.unvisitedIntersections()) {
    return v;
  }
  for (const v of clip.unvisitedIntersections()) {
    return v;
  }
  return null;
}

/**
 * Extract contour by following the correct direction based on entry/exit.
 */
function extractContourByDirection(
  start: Vertex,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon | null {
  const points: Point[] = [];
  let current: Vertex = start;
  let maxSteps = 10000;

  // Determine initial direction based on operation
  let forward = start.isEntry;
  if (operation === 'SUBTRACT' && start.source === 'clip') {
    forward = !forward;
  }

  do {
    current.visited = true;
    if (current.neighbor) {
      current.neighbor.visited = true;
    }

    points.push({ ...current.point });

    // At intersection, switch polygons and potentially direction
    if (current.isIntersection && current.neighbor) {
      current = current.neighbor;
      forward = current.isEntry;
      if (operation === 'SUBTRACT' && current.source === 'clip') {
        forward = !forward;
      }
    }

    // Move to next/prev based on direction
    const next = forward ? current.next : current.prev;
    if (!next) break;
    current = next;

    if (--maxSteps <= 0) break;
  } while (current !== start);

  if (points.length < 3) {
    return null;
  }

  return createPolygonFromPoints(points);
}
