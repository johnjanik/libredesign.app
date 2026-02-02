/**
 * Mechanical Drawing Module
 *
 * Comprehensive mechanical drawing tools including:
 * - Drawing views (orthographic, section, detail, auxiliary)
 * - GD&T symbols (feature control frames, datum symbols)
 * - Mechanical symbols (fasteners, bearings, gears)
 * - Welding and surface finish symbols
 */

export { MechanicalManager, createMechanicalManager } from './mechanical-manager';
export type {
  MechanicalDrawing,
  TitleBlock,
  MechanicalManagerEvents,
  ViewCreationOptions,
  SectionViewOptions,
  DetailViewOptions,
} from './mechanical-manager';

// Re-export types from core
export type {
  // View types
  DrawingView,
  SectionView,
  DetailView,
  AuxiliaryView,
  ViewProjection,
  SectionType,
  CuttingPlane,
  // GD&T types
  FeatureControlFrame,
  GDTCharacteristic,
  MaterialCondition,
  DatumReference,
  DatumSymbol,
  DatumTarget,
  // Mechanical symbol types
  FastenerSymbol,
  FastenerType,
  BearingSymbol,
  BearingType,
  GearSymbol,
  GearType,
  // Welding types
  WeldingSymbol,
  WeldSideInfo,
  WeldType,
  // Surface finish types
  SurfaceFinishSymbol,
  SurfaceLay,
} from '@core/types/mechanical';

export {
  // Factory functions
  createDrawingView,
  createFeatureControlFrame,
  createDatumSymbol,
  createWeldingSymbol,
  createSurfaceFinishSymbol,
  // Utilities
  requiresDatum,
  getGDTCategory,
  formatTolerance,
  // Symbol paths for rendering
  GDT_SYMBOL_PATHS,
} from '@core/types/mechanical';
