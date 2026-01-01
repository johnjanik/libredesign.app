/**
 * Geometry Module
 *
 * Exports for geometry operations including boolean operations, path offsetting,
 * and dash patterns.
 */
export * from './boolean';
export { offsetPath, offsetForStrokeAlignment, createStrokeOutline, } from './path-offset';
export type { OffsetConfig, OffsetResult } from './path-offset';
export { applyDashPattern, pathLength, pointAtLength, tangentAtLength, } from './dash-pattern';
export type { DashConfig, DashResult } from './dash-pattern';
//# sourceMappingURL=index.d.ts.map