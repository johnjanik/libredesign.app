/**
 * Degenerate Case Handling
 *
 * Handles special cases in boolean operations such as:
 * - Coincident edges
 * - Touching vertices
 * - Zero-area polygons
 * - Identical polygons
 */

import type { Point } from '@core/types/geometry';
import { Polygon, createPolygonFromPoints } from './polygon';
import { EPSILON, pointsEqual, signedArea } from './intersection';
import { classifyPoint } from './classify';

/**
 * Check if the polygon pair has degenerate cases that need special handling.
 */
export function isDegenerateCase(subject: Polygon, clip: Polygon): boolean {
  // Check for zero-area polygons
  if (isZeroArea(subject) || isZeroArea(clip)) {
    return true;
  }

  // Check if polygons share vertices
  if (hasSharedVertices(subject, clip)) {
    return true;
  }

  // Check for coincident edges
  if (hasCoincidentEdges(subject, clip)) {
    return true;
  }

  return false;
}

/**
 * Handle degenerate cases in boolean operations.
 */
export function handleDegenerateCases(
  subject: Polygon,
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  // Handle zero-area polygons
  if (isZeroArea(subject)) {
    return handleZeroAreaSubject(clip, operation);
  }
  if (isZeroArea(clip)) {
    return handleZeroAreaClip(subject, operation);
  }

  // Check for identical polygons
  if (arePolygonsIdentical(subject, clip)) {
    return handleIdenticalPolygons(subject, operation);
  }

  // Check if one polygon completely contains the other
  if (isPolygonFullyInside(subject, clip)) {
    return handleContainment(subject, clip, operation, true);
  }
  if (isPolygonFullyInside(clip, subject)) {
    return handleContainment(subject, clip, operation, false);
  }

  // For other degenerate cases, perturb vertices slightly
  const perturbedSubject = perturbPolygon(subject);
  return [perturbedSubject, clip];
}

/**
 * Check if a polygon has zero or near-zero area.
 */
export function isZeroArea(polygon: Polygon): boolean {
  const points = polygon.getPoints();
  if (points.length < 3) return true;

  const area = Math.abs(signedArea(points));
  return area < EPSILON;
}

/**
 * Check if two polygons share any vertices.
 */
export function hasSharedVertices(a: Polygon, b: Polygon): boolean {
  for (const va of a.vertices()) {
    for (const vb of b.vertices()) {
      if (pointsEqual(va.point, vb.point, EPSILON * 10)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if two polygons have coincident (overlapping) edges.
 */
export function hasCoincidentEdges(a: Polygon, b: Polygon): boolean {
  for (const [a1, a2] of a.edges()) {
    for (const [b1, b2] of b.edges()) {
      if (areEdgesCoincident(a1.point, a2.point, b1.point, b2.point)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if two edges are coincident (overlap).
 */
function areEdgesCoincident(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): boolean {
  // Check if edges are collinear
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x;
  const dy2 = b2.y - b1.y;

  // Cross product should be zero for parallel lines
  const cross = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(cross) > EPSILON) {
    return false;
  }

  // Check if they're on the same line
  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;
  const cross2 = dx * dy1 - dy * dx1;
  if (Math.abs(cross2) > EPSILON) {
    return false;
  }

  // Check if they overlap by projecting onto the line
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  if (len1 < EPSILON) return false;

  const t1 = 0;
  const t2 = 1;
  const t3 = (dx * dx1 + dy * dy1) / (len1 * len1);
  const t4 = t3 + (dx2 * dx1 + dy2 * dy1) / (len1 * len1);

  const minB = Math.min(t3, t4);
  const maxB = Math.max(t3, t4);

  // Check for overlap
  return minB < t2 - EPSILON && maxB > t1 + EPSILON;
}

/**
 * Check if two polygons are identical (same vertices in same order).
 */
export function arePolygonsIdentical(a: Polygon, b: Polygon): boolean {
  if (a.count !== b.count) return false;

  const pointsA = a.getOriginalPoints();
  const pointsB = b.getOriginalPoints();

  // Try all rotations
  for (let offset = 0; offset < pointsA.length; offset++) {
    let match = true;
    for (let i = 0; i < pointsA.length; i++) {
      const j = (i + offset) % pointsB.length;
      if (!pointsEqual(pointsA[i]!, pointsB[j]!, EPSILON)) {
        match = false;
        break;
      }
    }
    if (match) return true;

    // Also try reversed order
    match = true;
    for (let i = 0; i < pointsA.length; i++) {
      const j = (offset - i + pointsB.length) % pointsB.length;
      if (!pointsEqual(pointsA[i]!, pointsB[j]!, EPSILON)) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }

  return false;
}

/**
 * Check if polygon A is fully inside polygon B.
 */
export function isPolygonFullyInside(inner: Polygon, outer: Polygon): boolean {
  for (const v of inner.vertices()) {
    const classification = classifyPoint(v.point, outer);
    if (classification === 'outside') {
      return false;
    }
  }
  return true;
}

/**
 * Handle zero-area subject polygon.
 */
function handleZeroAreaSubject(
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  switch (operation) {
    case 'UNION':
      return [clip.clone()];
    case 'SUBTRACT':
      return [];
    case 'INTERSECT':
      return [];
    case 'EXCLUDE':
      return [clip.clone()];
  }
}

/**
 * Handle zero-area clip polygon.
 */
function handleZeroAreaClip(
  subject: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  switch (operation) {
    case 'UNION':
      return [subject.clone()];
    case 'SUBTRACT':
      return [subject.clone()];
    case 'INTERSECT':
      return [];
    case 'EXCLUDE':
      return [subject.clone()];
  }
}

/**
 * Handle identical polygons.
 */
function handleIdenticalPolygons(
  polygon: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): Polygon[] {
  switch (operation) {
    case 'UNION':
      return [polygon.clone()];
    case 'SUBTRACT':
      return []; // A - A = empty
    case 'INTERSECT':
      return [polygon.clone()]; // A ∩ A = A
    case 'EXCLUDE':
      return []; // A XOR A = empty
  }
}

/**
 * Handle containment (one polygon fully inside another).
 */
function handleContainment(
  subject: Polygon,
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE',
  subjectInClip: boolean
): Polygon[] {
  if (subjectInClip) {
    // Subject is inside clip
    switch (operation) {
      case 'UNION':
        return [clip.clone()];
      case 'SUBTRACT':
        return []; // Subject completely removed
      case 'INTERSECT':
        return [subject.clone()];
      case 'EXCLUDE':
        // Return clip with subject as hole (simplified: just return both)
        return [subject.clone(), clip.clone()];
    }
  } else {
    // Clip is inside subject
    switch (operation) {
      case 'UNION':
        return [subject.clone()];
      case 'SUBTRACT':
        // Return subject with clip as hole (simplified: just return subject)
        return [subject.clone()];
      case 'INTERSECT':
        return [clip.clone()];
      case 'EXCLUDE':
        return [subject.clone(), clip.clone()];
    }
  }
}

/**
 * Slightly perturb polygon vertices to avoid degenerate cases.
 */
export function perturbPolygon(polygon: Polygon, amount = EPSILON * 10): Polygon {
  const points: Point[] = [];

  for (const v of polygon.vertices()) {
    // Add small random perturbation
    const dx = (Math.random() - 0.5) * amount;
    const dy = (Math.random() - 0.5) * amount;
    points.push({
      x: v.point.x + dx,
      y: v.point.y + dy,
    });
  }

  return createPolygonFromPoints(points, polygon.source);
}

/**
 * Snap vertices that are very close together.
 */
export function snapNearbyVertices(
  subject: Polygon,
  clip: Polygon,
  tolerance = EPSILON * 10
): void {
  for (const vs of subject.vertices()) {
    for (const vc of clip.vertices()) {
      if (
        Math.abs(vs.point.x - vc.point.x) < tolerance &&
        Math.abs(vs.point.y - vc.point.y) < tolerance
      ) {
        // Snap clip vertex to subject vertex
        vc.point = { ...vs.point };
      }
    }
  }
}

/**
 * Remove duplicate consecutive vertices.
 */
export function removeDuplicateVertices(polygon: Polygon): void {
  if (!polygon.first || polygon.count < 2) return;

  let current = polygon.first;
  let removed = 0;

  do {
    const next = current.next!;
    if (
      next !== polygon.first &&
      pointsEqual(current.point, next.point, EPSILON)
    ) {
      // Remove next
      current.next = next.next;
      if (next.next) {
        next.next.prev = current;
      }
      removed++;
      continue;
    }
    current = current.next!;
  } while (current !== polygon.first && removed < polygon.count);
}
