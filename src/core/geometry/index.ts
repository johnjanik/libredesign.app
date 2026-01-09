/**
 * Geometry Module
 *
 * Exports for geometry operations including boolean operations, path offsetting,
 * and dash patterns.
 */

// Boolean operations
export * from './boolean';

// Path offsetting
export {
  offsetPath,
  offsetForStrokeAlignment,
  createStrokeOutline,
} from './path-offset';
export type { OffsetConfig, OffsetResult } from './path-offset';

// Dash patterns
export {
  applyDashPattern,
  pathLength,
  pointAtLength,
  tangentAtLength,
} from './dash-pattern';
export type { DashConfig, DashResult } from './dash-pattern';

// Boundary detection
export {
  BoundaryDetector,
  createBoundaryDetector,
  detectBoundaryAtPoint,
  linesToBoundarySegments,
  rectToBoundarySegments,
  polygonToBoundarySegments,
} from './boundary-detection';
export type {
  BoundarySegment,
  DetectedBoundary,
  BoundaryDetectionConfig,
} from './boundary-detection';
