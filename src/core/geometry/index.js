/**
 * Geometry Module
 *
 * Exports for geometry operations including boolean operations, path offsetting,
 * and dash patterns.
 */
// Boolean operations
export * from './boolean';
// Path offsetting
export { offsetPath, offsetForStrokeAlignment, createStrokeOutline, } from './path-offset';
// Dash patterns
export { applyDashPattern, pathLength, pointAtLength, tangentAtLength, } from './dash-pattern';
//# sourceMappingURL=index.js.map