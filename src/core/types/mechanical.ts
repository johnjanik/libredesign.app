/**
 * Mechanical Drawing Types
 *
 * Types for 2D mechanical drafting:
 * - View generation (orthographic, section, detail, auxiliary)
 * - GD&T (Geometric Dimensioning & Tolerancing)
 * - Mechanical symbols (fasteners, bearings, welds, surface finish)
 */

import type { NodeId } from './common';
import type { Point } from './geometry';

// =============================================================================
// View Generation
// =============================================================================

/**
 * View projection type
 */
export type ViewProjection =
  | 'front'
  | 'back'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'isometric'
  | 'dimetric'
  | 'trimetric';

/**
 * Section type for section views
 */
export type SectionType =
  | 'full'           // Full section through entire object
  | 'half'           // Half section (one side cut away)
  | 'offset'         // Stepped cutting plane
  | 'revolved'       // Section rotated into plane of view
  | 'removed'        // Section removed and placed elsewhere
  | 'broken_out';    // Local section showing interior

/**
 * Drawing view definition
 */
export interface DrawingView {
  /** View identifier */
  readonly id: NodeId;
  /** View type */
  readonly type: 'VIEW';
  /** View name/label */
  readonly name: string;
  /** View projection type */
  readonly projection: ViewProjection;
  /** View scale (e.g., 1:2, 2:1) */
  readonly scale: number;
  /** Position on sheet */
  readonly position: Point;
  /** Rotation in degrees */
  readonly rotation: number;
  /** Is this the primary view */
  readonly isPrimary: boolean;
  /** Parent view ID (for derived views) */
  readonly parentViewId?: NodeId;
  /** View boundary rectangle */
  readonly boundary: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** Show hidden lines */
  readonly showHidden: boolean;
  /** Show center lines */
  readonly showCenterlines: boolean;
  /** Geometry node IDs included in this view */
  readonly geometryIds: NodeId[];
}

/**
 * Section view definition
 */
export interface SectionView extends DrawingView {
  /** Section subtype */
  readonly sectionType: SectionType;
  /** Cutting plane definition */
  readonly cuttingPlane: CuttingPlane;
  /** Section hatch pattern */
  readonly hatchPattern?: string;
  /** Section hatch angle */
  readonly hatchAngle: number;
  /** Section hatch spacing */
  readonly hatchSpacing: number;
}

/**
 * Cutting plane for section views
 */
export interface CuttingPlane {
  /** Cutting plane segments */
  readonly segments: Array<{
    readonly start: Point;
    readonly end: Point;
  }>;
  /** Arrow direction points (where section is viewed from) */
  readonly arrowDirection: 'left' | 'right' | 'up' | 'down';
  /** Section label (e.g., "A-A") */
  readonly label: string;
}

/**
 * Detail view definition
 */
export interface DetailView extends DrawingView {
  /** Detail circle center on parent view */
  readonly detailCenter: Point;
  /** Detail circle radius on parent view */
  readonly detailRadius: number;
  /** Detail label (e.g., "A") */
  readonly detailLabel: string;
  /** Detail scale (typically enlarged) */
  readonly detailScale: number;
}

/**
 * Auxiliary view definition
 */
export interface AuxiliaryView extends DrawingView {
  /** Reference edge on parent view */
  readonly referenceEdge: {
    readonly start: Point;
    readonly end: Point;
  };
  /** Projection angle from reference edge */
  readonly projectionAngle: number;
}

// =============================================================================
// GD&T (Geometric Dimensioning & Tolerancing)
// =============================================================================

/**
 * GD&T characteristic symbols
 */
export type GDTCharacteristic =
  // Form tolerances (no datum required)
  | 'straightness'
  | 'flatness'
  | 'circularity'
  | 'cylindricity'
  // Profile tolerances
  | 'profile_line'
  | 'profile_surface'
  // Orientation tolerances (datum required)
  | 'angularity'
  | 'perpendicularity'
  | 'parallelism'
  // Location tolerances (datum required)
  | 'position'
  | 'concentricity'
  | 'symmetry'
  // Runout tolerances (datum required)
  | 'circular_runout'
  | 'total_runout';

/**
 * Material condition modifiers
 */
export type MaterialCondition =
  | 'MMC'   // Maximum Material Condition (M)
  | 'LMC'   // Least Material Condition (L)
  | 'RFS';  // Regardless of Feature Size (S or none)

/**
 * Datum reference
 */
export interface DatumReference {
  /** Datum letter (A, B, C, etc.) */
  readonly letter: string;
  /** Material condition modifier */
  readonly modifier?: MaterialCondition;
}

/**
 * Feature Control Frame (FCF)
 */
export interface FeatureControlFrame {
  /** FCF identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'FCF';
  /** GD&T characteristic */
  readonly characteristic: GDTCharacteristic;
  /** Tolerance zone shape (diameter for cylindrical) */
  readonly zoneDiameter: boolean;
  /** Tolerance value in drawing units */
  readonly toleranceValue: number;
  /** Tolerance modifier */
  readonly toleranceModifier?: MaterialCondition;
  /** Primary datum */
  readonly primaryDatum?: DatumReference;
  /** Secondary datum */
  readonly secondaryDatum?: DatumReference;
  /** Tertiary datum */
  readonly tertiaryDatum?: DatumReference;
  /** Position on drawing */
  readonly position: Point;
  /** Leader line to feature */
  readonly leaderPoints?: Point[];
  /** Attached to feature surface (not centerline) */
  readonly attachedToSurface: boolean;
}

/**
 * Datum symbol on drawing
 */
export interface DatumSymbol {
  /** Symbol identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'DATUM';
  /** Datum letter */
  readonly letter: string;
  /** Position on drawing */
  readonly position: Point;
  /** Attachment type */
  readonly attachmentType: 'surface' | 'centerline' | 'axis';
  /** Leader line points (if not directly on surface) */
  readonly leaderPoints?: Point[];
  /** Rotation for symbol orientation */
  readonly rotation: number;
}

/**
 * Datum target
 */
export interface DatumTarget {
  /** Target identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'DATUM_TARGET';
  /** Datum letter */
  readonly letter: string;
  /** Target number (1, 2, 3) */
  readonly targetNumber: number;
  /** Target type */
  readonly targetType: 'point' | 'line' | 'area';
  /** Position */
  readonly position: Point;
  /** Size (for line length or area diameter) */
  readonly size?: number;
  /** Contact area for area targets */
  readonly areaShape?: 'circle' | 'rectangle';
}

// =============================================================================
// GD&T Symbol Rendering Data
// =============================================================================

/**
 * GD&T characteristic symbol paths for rendering
 */
export const GDT_SYMBOL_PATHS: Record<GDTCharacteristic, string> = {
  // Form
  straightness: 'M0,5 L20,5',
  flatness: 'M0,0 L20,0 L20,10 L0,10 Z',
  circularity: 'M10,0 A10,10 0 1,1 10,20 A10,10 0 1,1 10,0',
  cylindricity: 'M5,0 L15,0 M5,0 A5,10 0 0,0 5,20 M15,0 A5,10 0 0,1 15,20 M5,20 L15,20',

  // Profile
  profile_line: 'M0,10 Q10,0 20,10',
  profile_surface: 'M0,10 Q10,0 20,10 M0,12 L20,12',

  // Orientation
  angularity: 'M0,20 L10,0 L20,20',
  perpendicularity: 'M0,20 L0,0 L10,0',
  parallelism: 'M0,0 L20,0 M0,8 L20,8',

  // Location
  position: 'M10,0 L10,20 M0,10 L20,10 M10,10 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0',
  concentricity: 'M10,10 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M10,10 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
  symmetry: 'M0,0 L20,0 M0,20 L20,20 M10,0 L10,20',

  // Runout
  circular_runout: 'M0,10 L5,10 M20,10 L15,10 M10,10 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
  total_runout: 'M0,10 L5,10 M20,10 L15,10 M10,10 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M0,15 L5,15 M20,15 L15,15',
};

/**
 * Material condition modifier symbols
 */
export const MATERIAL_CONDITION_SYMBOLS: Record<MaterialCondition, string> = {
  MMC: 'M',
  LMC: 'L',
  RFS: '', // No symbol for RFS (default)
};

// =============================================================================
// Mechanical Symbols
// =============================================================================

/**
 * Fastener type
 */
export type FastenerType =
  | 'hex_bolt'
  | 'hex_nut'
  | 'socket_head_cap_screw'
  | 'flat_head_screw'
  | 'pan_head_screw'
  | 'set_screw'
  | 'washer_flat'
  | 'washer_lock'
  | 'washer_spring'
  | 'rivet'
  | 'pin_dowel'
  | 'pin_cotter'
  | 'pin_roll';

/**
 * Fastener symbol
 */
export interface FastenerSymbol {
  /** Symbol identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'FASTENER';
  /** Fastener type */
  readonly fastenerType: FastenerType;
  /** Size designation (e.g., "M8", "#10-32") */
  readonly size: string;
  /** Thread specification */
  readonly thread?: {
    readonly pitch: number;
    readonly class: string;
  };
  /** Length (for bolts/screws) */
  readonly length?: number;
  /** View type */
  readonly viewType: 'top' | 'side' | 'section';
  /** Position on drawing */
  readonly position: Point;
  /** Rotation */
  readonly rotation: number;
  /** Scale */
  readonly scale: number;
}

/**
 * Bearing type
 */
export type BearingType =
  | 'ball_radial'
  | 'ball_angular_contact'
  | 'ball_thrust'
  | 'roller_cylindrical'
  | 'roller_tapered'
  | 'roller_spherical'
  | 'roller_needle'
  | 'plain_sleeve'
  | 'plain_thrust';

/**
 * Bearing symbol
 */
export interface BearingSymbol {
  /** Symbol identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'BEARING';
  /** Bearing type */
  readonly bearingType: BearingType;
  /** Bearing designation (e.g., "6205", "32010") */
  readonly designation?: string;
  /** Inner diameter */
  readonly innerDiameter: number;
  /** Outer diameter */
  readonly outerDiameter: number;
  /** Width */
  readonly width: number;
  /** View type */
  readonly viewType: 'front' | 'section';
  /** Position */
  readonly position: Point;
  /** Rotation */
  readonly rotation: number;
}

/**
 * Gear type
 */
export type GearType =
  | 'spur'
  | 'helical'
  | 'bevel'
  | 'worm'
  | 'worm_wheel'
  | 'rack';

/**
 * Gear symbol
 */
export interface GearSymbol {
  /** Symbol identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'GEAR';
  /** Gear type */
  readonly gearType: GearType;
  /** Number of teeth */
  readonly teeth: number;
  /** Module (metric) or diametral pitch (imperial) */
  readonly module?: number;
  readonly diametralPitch?: number;
  /** Pitch diameter */
  readonly pitchDiameter: number;
  /** Pressure angle */
  readonly pressureAngle: number;
  /** View type */
  readonly viewType: 'front' | 'section' | 'side';
  /** Position */
  readonly position: Point;
  /** Rotation */
  readonly rotation: number;
}

// =============================================================================
// Welding Symbols
// =============================================================================

/**
 * Weld type
 */
export type WeldType =
  | 'fillet'
  | 'groove_square'
  | 'groove_v'
  | 'groove_bevel'
  | 'groove_u'
  | 'groove_j'
  | 'groove_flare_v'
  | 'groove_flare_bevel'
  | 'plug_slot'
  | 'spot'
  | 'seam'
  | 'back_backing'
  | 'surfacing'
  | 'edge';

/**
 * Weld contour
 */
export type WeldContour = 'flat' | 'convex' | 'concave';

/**
 * Weld finish method
 */
export type WeldFinish = 'chipping' | 'grinding' | 'hammering' | 'machining' | 'rolling' | 'unspecified';

/**
 * Welding symbol (AWS A2.4 standard)
 */
export interface WeldingSymbol {
  /** Symbol identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'WELD';
  /** Position on drawing */
  readonly position: Point;
  /** Arrow points to joint */
  readonly arrowPoint: Point;
  /** Arrow side weld */
  readonly arrowSide?: WeldSideInfo;
  /** Other side weld */
  readonly otherSide?: WeldSideInfo;
  /** Weld all around */
  readonly allAround: boolean;
  /** Field weld flag */
  readonly fieldWeld: boolean;
  /** Tail information (process, specification) */
  readonly tail?: string;
  /** Stagger symbol */
  readonly staggered: boolean;
}

/**
 * Information for one side of weld
 */
export interface WeldSideInfo {
  /** Weld type */
  readonly weldType: WeldType;
  /** Size (leg length for fillet, depth for groove) */
  readonly size?: number;
  /** Length of weld */
  readonly length?: number;
  /** Pitch (center-to-center spacing) */
  readonly pitch?: number;
  /** Contour */
  readonly contour?: WeldContour;
  /** Finish method */
  readonly finish?: WeldFinish;
  /** Root opening (for groove welds) */
  readonly rootOpening?: number;
  /** Groove angle */
  readonly grooveAngle?: number;
  /** Effective throat (for partial penetration) */
  readonly effectiveThroat?: number;
}

// =============================================================================
// Surface Finish Symbols
// =============================================================================

/**
 * Surface lay direction
 */
export type SurfaceLay =
  | 'parallel'       // =
  | 'perpendicular'  // ⊥
  | 'angular'        // X
  | 'multidirectional' // M
  | 'circular'       // C
  | 'radial'         // R
  | 'particulate';   // P

/**
 * Surface finish symbol (ISO 1302 / ASME Y14.36)
 */
export interface SurfaceFinishSymbol {
  /** Symbol identifier */
  readonly id: NodeId;
  /** Node type */
  readonly type: 'SURFACE_FINISH';
  /** Position on drawing */
  readonly position: Point;
  /** Rotation */
  readonly rotation: number;
  /** Leader points to surface */
  readonly leaderPoints?: Point[];
  /** Surface roughness Ra (arithmetic mean) */
  readonly roughnessRa?: number;
  /** Surface roughness Rz (average max height) */
  readonly roughnessRz?: number;
  /** Roughness cutoff wavelength */
  readonly cutoff?: number;
  /** Machining allowance */
  readonly machiningAllowance?: number;
  /** Lay direction */
  readonly lay?: SurfaceLay;
  /** Material removal required */
  readonly materialRemovalRequired: 'required' | 'prohibited' | 'optional';
  /** Production method */
  readonly productionMethod?: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a drawing view
 */
export function createDrawingView(
  name: string,
  projection: ViewProjection,
  position: Point,
  options: {
    scale?: number;
    rotation?: number;
    isPrimary?: boolean;
    parentViewId?: NodeId;
    showHidden?: boolean;
    showCenterlines?: boolean;
  } = {}
): DrawingView {
  const baseView = {
    id: `view-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'VIEW' as const,
    name,
    projection,
    scale: options.scale ?? 1,
    position,
    rotation: options.rotation ?? 0,
    isPrimary: options.isPrimary ?? false,
    boundary: { x: position.x, y: position.y, width: 100, height: 100 },
    showHidden: options.showHidden ?? false,
    showCenterlines: options.showCenterlines ?? true,
    geometryIds: [] as NodeId[],
  };

  if (options.parentViewId !== undefined) {
    return { ...baseView, parentViewId: options.parentViewId };
  }
  return baseView;
}

/**
 * Create a feature control frame
 */
export function createFeatureControlFrame(
  characteristic: GDTCharacteristic,
  toleranceValue: number,
  position: Point,
  options: {
    zoneDiameter?: boolean;
    toleranceModifier?: MaterialCondition;
    primaryDatum?: DatumReference;
    secondaryDatum?: DatumReference;
    tertiaryDatum?: DatumReference;
    leaderPoints?: Point[];
    attachedToSurface?: boolean;
  } = {}
): FeatureControlFrame {
  const fcf: FeatureControlFrame = {
    id: `fcf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'FCF',
    characteristic,
    zoneDiameter: options.zoneDiameter ?? false,
    toleranceValue,
    position,
    attachedToSurface: options.attachedToSurface ?? true,
  };

  let result = fcf;
  if (options.toleranceModifier) {
    result = { ...result, toleranceModifier: options.toleranceModifier };
  }
  if (options.primaryDatum) {
    result = { ...result, primaryDatum: options.primaryDatum };
  }
  if (options.secondaryDatum) {
    result = { ...result, secondaryDatum: options.secondaryDatum };
  }
  if (options.tertiaryDatum) {
    result = { ...result, tertiaryDatum: options.tertiaryDatum };
  }
  if (options.leaderPoints) {
    result = { ...result, leaderPoints: options.leaderPoints };
  }

  return result;
}

/**
 * Create a datum symbol
 */
export function createDatumSymbol(
  letter: string,
  position: Point,
  options: {
    attachmentType?: 'surface' | 'centerline' | 'axis';
    leaderPoints?: Point[];
    rotation?: number;
  } = {}
): DatumSymbol {
  const datum: DatumSymbol = {
    id: `datum-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'DATUM',
    letter: letter.toUpperCase(),
    position,
    attachmentType: options.attachmentType ?? 'surface',
    rotation: options.rotation ?? 0,
  };

  if (options.leaderPoints) {
    return { ...datum, leaderPoints: options.leaderPoints };
  }
  return datum;
}

/**
 * Create a welding symbol
 */
export function createWeldingSymbol(
  position: Point,
  arrowPoint: Point,
  options: {
    arrowSide?: WeldSideInfo;
    otherSide?: WeldSideInfo;
    allAround?: boolean;
    fieldWeld?: boolean;
    tail?: string;
    staggered?: boolean;
  } = {}
): WeldingSymbol {
  const weld: WeldingSymbol = {
    id: `weld-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'WELD',
    position,
    arrowPoint,
    allAround: options.allAround ?? false,
    fieldWeld: options.fieldWeld ?? false,
    staggered: options.staggered ?? false,
  };

  let result = weld;
  if (options.arrowSide) {
    result = { ...result, arrowSide: options.arrowSide };
  }
  if (options.otherSide) {
    result = { ...result, otherSide: options.otherSide };
  }
  if (options.tail) {
    result = { ...result, tail: options.tail };
  }

  return result;
}

/**
 * Create a surface finish symbol
 */
export function createSurfaceFinishSymbol(
  position: Point,
  options: {
    rotation?: number;
    leaderPoints?: Point[];
    roughnessRa?: number;
    roughnessRz?: number;
    cutoff?: number;
    machiningAllowance?: number;
    lay?: SurfaceLay;
    materialRemovalRequired?: 'required' | 'prohibited' | 'optional';
    productionMethod?: string;
  } = {}
): SurfaceFinishSymbol {
  const symbol: SurfaceFinishSymbol = {
    id: `sf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'SURFACE_FINISH',
    position,
    rotation: options.rotation ?? 0,
    materialRemovalRequired: options.materialRemovalRequired ?? 'optional',
  };

  let result = symbol;
  if (options.leaderPoints) {
    result = { ...result, leaderPoints: options.leaderPoints };
  }
  if (options.roughnessRa !== undefined) {
    result = { ...result, roughnessRa: options.roughnessRa };
  }
  if (options.roughnessRz !== undefined) {
    result = { ...result, roughnessRz: options.roughnessRz };
  }
  if (options.cutoff !== undefined) {
    result = { ...result, cutoff: options.cutoff };
  }
  if (options.machiningAllowance !== undefined) {
    result = { ...result, machiningAllowance: options.machiningAllowance };
  }
  if (options.lay) {
    result = { ...result, lay: options.lay };
  }
  if (options.productionMethod) {
    result = { ...result, productionMethod: options.productionMethod };
  }

  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a GD&T characteristic requires datum reference
 */
export function requiresDatum(characteristic: GDTCharacteristic): boolean {
  const noDatumRequired: GDTCharacteristic[] = [
    'straightness',
    'flatness',
    'circularity',
    'cylindricity',
  ];
  return !noDatumRequired.includes(characteristic);
}

/**
 * Get GD&T category for a characteristic
 */
export function getGDTCategory(characteristic: GDTCharacteristic): string {
  const categories: Record<string, GDTCharacteristic[]> = {
    form: ['straightness', 'flatness', 'circularity', 'cylindricity'],
    profile: ['profile_line', 'profile_surface'],
    orientation: ['angularity', 'perpendicularity', 'parallelism'],
    location: ['position', 'concentricity', 'symmetry'],
    runout: ['circular_runout', 'total_runout'],
  };

  for (const [category, chars] of Object.entries(categories)) {
    if (chars.includes(characteristic)) {
      return category;
    }
  }
  return 'unknown';
}

/**
 * Format tolerance value with proper precision
 */
export function formatTolerance(value: number, units: 'mm' | 'inch'): string {
  if (units === 'mm') {
    return value.toFixed(3);
  } else {
    return value.toFixed(4);
  }
}

/**
 * Parse weld size notation (e.g., "6" for 6mm leg, "1/4" for imperial)
 */
export function parseWeldSize(notation: string): number {
  if (notation.includes('/')) {
    const [num, denom] = notation.split('/').map(Number);
    return (num ?? 0) / (denom ?? 1);
  }
  return parseFloat(notation);
}
