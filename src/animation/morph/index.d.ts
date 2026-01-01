/**
 * Shape Morphing Module
 *
 * Provides path morphing functionality for animating between
 * different vector shapes with smooth transitions.
 */
export { checkCompatibility, countPoints, isClosedPath, getWindingDirection, getCommandTypes, hasCompatibleCommands, getPathBounds, } from './path-compatibility';
export type { CompatibilityLevel, CompatibilityResult, CompatibilityOptions, } from './path-compatibility';
export { extractPoints, matchPoints, subdivideSegment, addPointsToPath, normalizePathPoints, } from './point-matching';
export type { PathPoint, PointMapping, MatchingResult, MatchingOptions, } from './point-matching';
export { prepareMorph, interpolatePathArrays, createMorphAnimator, } from './path-interpolator';
export type { PathMorphTransition, MorphOptions, } from './path-interpolator';
//# sourceMappingURL=index.d.ts.map