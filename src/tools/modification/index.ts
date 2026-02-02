/**
 * Modification tools module exports
 */

export { MirrorTool, createMirrorTool, mirrorPoint, mirrorBounds } from './mirror-tool';
export type { MirrorAxis, MirrorOptions, MirrorResult } from './mirror-tool';

export {
  ArrayTool,
  createArrayTool,
  calculateRectangularArrayPositions,
  calculatePolarArrayPositions,
} from './array-tool';
export type {
  ArrayType,
  ArrayOptions,
  ArrayResult,
  RectangularArrayOptions,
  PolarArrayOptions,
} from './array-tool';

// Trim tool
export { TrimTool, createTrimTool } from './trim-tool';
export type { TrimResult, TrimmableLine, TrimToolOptions } from './trim-tool';

// Extend tool
export { ExtendTool, createExtendTool } from './extend-tool';
export type { ExtendResult, ExtendableLine, ExtendToolOptions } from './extend-tool';

// Fillet tool
export { FilletTool, createFilletTool } from './fillet-tool';
export type { FilletResult, FilletableLine, FilletToolOptions } from './fillet-tool';

// Chamfer tool
export { ChamferTool, createChamferTool } from './chamfer-tool';
export type { ChamferResult, ChamferableLine, ChamferToolOptions, ChamferMode } from './chamfer-tool';

// Divide tool
export { DivideTool, createDivideTool, extractCurveDataFromNode } from './divide-tool';
export type {
  DivisionMode,
  DivisibleCurveType,
  DivideToolOptions,
  DivideResult,
  CurveData,
} from './divide-tool';

// Interactive divide tool (for tool manager)
export { InteractiveDivideTool, createInteractiveDivideTool } from './interactive-divide-tool';
export type { InteractiveDivideToolOptions, DivisibleCurve } from './interactive-divide-tool';
