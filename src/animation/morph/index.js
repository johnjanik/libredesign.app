/**
 * Shape Morphing Module
 *
 * Provides path morphing functionality for animating between
 * different vector shapes with smooth transitions.
 */
// Path compatibility checking
export { checkCompatibility, countPoints, isClosedPath, getWindingDirection, getCommandTypes, hasCompatibleCommands, getPathBounds, } from './path-compatibility';
// Point matching
export { extractPoints, matchPoints, subdivideSegment, addPointsToPath, normalizePathPoints, } from './point-matching';
// Path interpolation
export { prepareMorph, interpolatePathArrays, createMorphAnimator, } from './path-interpolator';
//# sourceMappingURL=index.js.map