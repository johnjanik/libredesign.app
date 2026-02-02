/**
 * Measurement Tools Module
 *
 * Tools for measuring geometric properties:
 * - Angle measurement between points/lines
 * - Distance measurement (if implemented elsewhere, re-export)
 *
 * Also re-exports area/perimeter calculator utilities.
 */

// Angle measurement tool
export {
  AngleTool,
  createAngleTool,
  angleBetweenVectors,
  angleBetweenLines,
  type AngleUnit,
  type AngleMeasurement,
  type AngleToolOptions,
} from './angle-tool';

// Re-export area calculator utilities from core
export {
  calculatePathProperties,
  shoelaceArea,
  polygonPerimeter,
  polygonCentroid,
  pathToPolygon,
  flattenCubicBezier,
  cubicBezierLength,
  pointsBounds,
  rectangleArea,
  rectanglePerimeter,
  ellipseArea,
  ellipseCircumference,
  regularPolygonArea,
  regularPolygonPerimeter,
  starArea,
  starPerimeter,
  formatArea,
  formatLength,
  UNIT_FACTORS,
  type GeometricProperties,
  type AreaCalculationOptions,
} from '@core/geometry/area-calculator';
