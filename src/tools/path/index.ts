/**
 * Path Tools
 *
 * Tools for editing vector paths.
 */

export { NodeEditTool, createNodeEditTool, type NodeEditToolOptions } from './node-edit-tool';
export {
  type EditableAnchor,
  type HandleType,
  type HandleHitResult,
  type SegmentHitResult,
  type ParsedPath,
  parsePathToAnchors,
  buildPathFromAnchors,
  findClosestAnchor,
  findClosestHandle,
  findClosestSegment,
  splitSegmentAt,
  deleteAnchor,
  toggleAnchorType,
  moveAnchor,
  moveHandle,
  distance,
} from './path-utils';
export {
  type PathEndpoint,
  type JoinOptions,
  type SplitResult,
  type JoinPathsOperation,
  type SplitPathOperation,
  findPathEndpoints,
  findClosestEndpoint,
  joinPaths,
  joinMultiplePaths,
  splitPathAtAnchor,
  splitPathAtParameter,
  breakPathAtAnchor,
  findClosestPointOnPath,
} from './join-split-tool';
