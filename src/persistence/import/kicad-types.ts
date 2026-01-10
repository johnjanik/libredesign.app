/**
 * KiCad File Format Types
 *
 * Type definitions for KiCad .kicad_pcb files (S-expression format).
 * Based on KiCad 6/7/8 file format specification.
 */

// =============================================================================
// S-Expression Types
// =============================================================================

/**
 * S-expression node - either an atom or a list
 */
export type SExpr = string | SExpr[];

/**
 * Parsed S-expression with named children for easier access
 */
export interface ParsedSExpr {
  name: string;
  values: string[];
  children: ParsedSExpr[];
  raw: SExpr;
}

// =============================================================================
// Basic Types
// =============================================================================

/**
 * 2D point in KiCad coordinates (mm)
 */
export interface KiCadPoint {
  x: number;
  y: number;
}

/**
 * Size specification
 */
export interface KiCadSize {
  width: number;
  height: number;
}

/**
 * Position with optional rotation
 */
export interface KiCadPosition extends KiCadPoint {
  angle?: number;
}

/**
 * Stroke style
 */
export interface KiCadStroke {
  width: number;
  type: 'solid' | 'dash' | 'dot' | 'dash_dot' | 'default';
  color?: KiCadColor;
}

/**
 * Color in RGBA
 */
export interface KiCadColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// =============================================================================
// Layer Types
// =============================================================================

/**
 * KiCad layer definition
 */
export interface KiCadLayer {
  ordinal: number;
  name: string;
  type: 'signal' | 'power' | 'mixed' | 'jumper' | 'user';
  userName?: string;
}

/**
 * Standard KiCad layer names
 */
export type KiCadLayerName =
  | 'F.Cu' | 'In1.Cu' | 'In2.Cu' | 'In3.Cu' | 'In4.Cu' | 'B.Cu'
  | 'F.Adhes' | 'B.Adhes'
  | 'F.Paste' | 'B.Paste'
  | 'F.SilkS' | 'B.SilkS'
  | 'F.Mask' | 'B.Mask'
  | 'Dwgs.User' | 'Cmts.User'
  | 'Eco1.User' | 'Eco2.User'
  | 'Edge.Cuts'
  | 'Margin'
  | 'F.CrtYd' | 'B.CrtYd'
  | 'F.Fab' | 'B.Fab'
  | 'User.1' | 'User.2' | 'User.3' | 'User.4'
  | 'User.5' | 'User.6' | 'User.7' | 'User.8' | 'User.9';

// =============================================================================
// Net Types
// =============================================================================

/**
 * Net definition
 */
export interface KiCadNet {
  id: number;
  name: string;
}

/**
 * Net class definition
 */
export interface KiCadNetClass {
  name: string;
  description?: string;
  clearance: number;
  traceWidth: number;
  viaDiameter: number;
  viaDrill: number;
  microViaDiameter?: number;
  microViaDrill?: number;
  nets: string[];
}

// =============================================================================
// Graphic Types
// =============================================================================

/**
 * Graphic line
 */
export interface KiCadGrLine {
  type: 'gr_line';
  start: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  stroke?: KiCadStroke;
}

/**
 * Graphic arc
 */
export interface KiCadGrArc {
  type: 'gr_arc';
  start: KiCadPoint;
  mid?: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  stroke?: KiCadStroke;
}

/**
 * Graphic circle
 */
export interface KiCadGrCircle {
  type: 'gr_circle';
  center: KiCadPoint;
  end: KiCadPoint; // Point on circumference
  layer: string;
  width: number;
  fill?: 'none' | 'solid';
  stroke?: KiCadStroke;
}

/**
 * Graphic rectangle
 */
export interface KiCadGrRect {
  type: 'gr_rect';
  start: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  fill?: 'none' | 'solid';
  stroke?: KiCadStroke;
}

/**
 * Graphic polygon
 */
export interface KiCadGrPoly {
  type: 'gr_poly';
  pts: KiCadPoint[];
  layer: string;
  width: number;
  fill?: 'none' | 'solid';
  stroke?: KiCadStroke;
}

/**
 * Graphic text
 */
export interface KiCadGrText {
  type: 'gr_text';
  text: string;
  at: KiCadPosition;
  layer: string;
  effects?: {
    font?: {
      size: KiCadSize;
      thickness?: number;
      bold?: boolean;
      italic?: boolean;
    };
    justify?: ('left' | 'right' | 'center' | 'top' | 'bottom' | 'mirror')[];
  };
}

/**
 * All graphic types
 */
export type KiCadGraphic =
  | KiCadGrLine
  | KiCadGrArc
  | KiCadGrCircle
  | KiCadGrRect
  | KiCadGrPoly
  | KiCadGrText;

// =============================================================================
// Track Types
// =============================================================================

/**
 * PCB segment (track piece)
 */
export interface KiCadSegment {
  type: 'segment';
  start: KiCadPoint;
  end: KiCadPoint;
  width: number;
  layer: string;
  net: number;
  locked?: boolean;
  tstamp?: string;
}

/**
 * PCB arc segment
 */
export interface KiCadArc {
  type: 'arc';
  start: KiCadPoint;
  mid: KiCadPoint;
  end: KiCadPoint;
  width: number;
  layer: string;
  net: number;
  locked?: boolean;
  tstamp?: string;
}

// =============================================================================
// Via Types
// =============================================================================

/**
 * Via type
 */
export type KiCadViaType = 'through' | 'blind' | 'micro';

/**
 * Via definition
 */
export interface KiCadVia {
  type: 'via';
  viaType?: KiCadViaType;
  at: KiCadPoint;
  size: number;
  drill: number;
  layers: [string, string];
  net: number;
  locked?: boolean;
  free?: boolean;
  tstamp?: string;
}

// =============================================================================
// Pad Types
// =============================================================================

/**
 * Pad type
 */
export type KiCadPadType = 'thru_hole' | 'smd' | 'connect' | 'np_thru_hole';

/**
 * Pad shape
 */
export type KiCadPadShape = 'circle' | 'rect' | 'oval' | 'trapezoid' | 'roundrect' | 'custom';

/**
 * Drill definition
 */
export interface KiCadDrill {
  diameter: number;
  width?: number;  // For oval
  height?: number; // For oval
  offset?: KiCadPoint;
}

/**
 * Pad definition
 */
export interface KiCadPad {
  number: string;
  padType: KiCadPadType;
  shape: KiCadPadShape;
  at: KiCadPosition;
  size: KiCadSize;
  drill?: KiCadDrill;
  layers: string[];
  roundrectRatio?: number;
  net?: { id: number; name: string };
  pinFunction?: string;
  pinType?: string;
  diePad?: boolean;
  solderMaskMargin?: number;
  solderPasteMargin?: number;
  solderPasteRatio?: number;
  clearance?: number;
  thermalBridgeWidth?: number;
  thermalGap?: number;
  customPadOptions?: {
    clearance: 'outline' | 'convexhull';
    anchor: KiCadPadShape;
  };
  primitives?: KiCadGraphic[];
  removeUnusedLayers?: boolean;
  keepEndLayers?: boolean;
  tstamp?: string;
}

// =============================================================================
// Footprint Types
// =============================================================================

/**
 * Footprint text field
 */
export interface KiCadFpText {
  type: 'fp_text';
  textType: 'reference' | 'value' | 'user';
  text: string;
  at: KiCadPosition;
  layer: string;
  hide?: boolean;
  effects?: {
    font?: {
      size: KiCadSize;
      thickness?: number;
      bold?: boolean;
      italic?: boolean;
    };
    justify?: ('left' | 'right' | 'center' | 'top' | 'bottom' | 'mirror')[];
  };
  tstamp?: string;
}

/**
 * Footprint line
 */
export interface KiCadFpLine {
  type: 'fp_line';
  start: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  stroke?: KiCadStroke;
}

/**
 * Footprint arc
 */
export interface KiCadFpArc {
  type: 'fp_arc';
  start: KiCadPoint;
  mid?: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  stroke?: KiCadStroke;
}

/**
 * Footprint circle
 */
export interface KiCadFpCircle {
  type: 'fp_circle';
  center: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  fill?: 'none' | 'solid';
  stroke?: KiCadStroke;
}

/**
 * Footprint rectangle
 */
export interface KiCadFpRect {
  type: 'fp_rect';
  start: KiCadPoint;
  end: KiCadPoint;
  layer: string;
  width: number;
  fill?: 'none' | 'solid';
  stroke?: KiCadStroke;
}

/**
 * Footprint polygon
 */
export interface KiCadFpPoly {
  type: 'fp_poly';
  pts: KiCadPoint[];
  layer: string;
  width: number;
  fill?: 'none' | 'solid';
  stroke?: KiCadStroke;
}

/**
 * Footprint graphic types
 */
export type KiCadFpGraphic =
  | KiCadFpLine
  | KiCadFpArc
  | KiCadFpCircle
  | KiCadFpRect
  | KiCadFpPoly
  | KiCadFpText;

/**
 * 3D model reference
 */
export interface KiCadModel3D {
  path: string;
  offset?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  rotate?: { x: number; y: number; z: number };
  hide?: boolean;
}

/**
 * Footprint definition
 */
export interface KiCadFootprint {
  name: string;
  library?: string;
  layer: 'F.Cu' | 'B.Cu';
  at: KiCadPosition;
  descr?: string;
  tags?: string[];
  path?: string;
  attr?: ('smd' | 'through_hole' | 'board_only' | 'exclude_from_pos_files' | 'exclude_from_bom')[];
  pads: KiCadPad[];
  graphics: KiCadFpGraphic[];
  model?: KiCadModel3D;
  locked?: boolean;
  placed?: boolean;
  tstamp?: string;
}

// =============================================================================
// Zone Types
// =============================================================================

/**
 * Zone fill settings
 */
export interface KiCadZoneFill {
  yes?: boolean;
  mode?: 'solid' | 'hatch';
  thermalGap?: number;
  thermalBridgeWidth?: number;
  smoothingStyle?: 'none' | 'chamfer' | 'fillet';
  smoothingRadius?: number;
  islandRemovalMode?: number;
  islandAreaMin?: number;
  hatchThickness?: number;
  hatchGap?: number;
  hatchOrientation?: number;
  hatchSmoothingLevel?: number;
  hatchSmoothingValue?: number;
  hatchBorderAlgorithm?: 'hatch_thickness' | 'min_thickness';
  hatchMinHoleArea?: number;
}

/**
 * Zone keepout settings
 */
export interface KiCadZoneKeepout {
  tracks?: 'allowed' | 'not_allowed';
  vias?: 'allowed' | 'not_allowed';
  pads?: 'allowed' | 'not_allowed';
  copperpour?: 'allowed' | 'not_allowed';
  footprints?: 'allowed' | 'not_allowed';
}

/**
 * Zone definition
 */
export interface KiCadZone {
  net: number;
  netName: string;
  layer?: string;
  layers?: string[];
  name?: string;
  priority?: number;
  polygon: KiCadPoint[];
  filledPolygons?: KiCadPoint[][];
  minThickness?: number;
  connectPads?: 'yes' | 'no' | 'thru_hole_only';
  padConnection?: 'thermal_reliefs' | 'solid' | 'none';
  fill?: KiCadZoneFill;
  keepout?: KiCadZoneKeepout;
  locked?: boolean;
  tstamp?: string;
}

// =============================================================================
// Setup/Rules Types
// =============================================================================

/**
 * Design rules from setup section
 */
export interface KiCadSetup {
  stackupLayers?: number;
  padToMaskClearance?: number;
  solderMaskMinWidth?: number;
  padToPasteClearance?: number;
  padToPasteClearanceRatio?: number;
  auxAxisOrigin?: KiCadPoint;
  gridOrigin?: KiCadPoint;
  plotOptions?: Record<string, unknown>;
}

/**
 * Design rules
 */
export interface KiCadDesignRules {
  clearance?: number;
  trackWidth?: number;
  viaDiameter?: number;
  viaDrill?: number;
  microViaDiameter?: number;
  microViaDrill?: number;
  microViasAllowed?: boolean;
  microViaMinDrill?: number;
  buriedViasAllowed?: boolean;
  minClearance?: number;
  minTrackWidth?: number;
  minViaDrill?: number;
  minViaAnnulus?: number;
  minThroughHoleDrill?: number;
  minMicroViaDrill?: number;
  minHoleToHole?: number;
  minSilkClearance?: number;
  maxError?: number;
  copperLayerCount?: number;
}

// =============================================================================
// Full PCB Document
// =============================================================================

/**
 * Complete KiCad PCB document
 */
export interface KiCadPCB {
  version: number;
  generator: string;
  generatorVersion?: string;
  general?: {
    thickness?: number;
    drawingsCount?: number;
    tracksCount?: number;
    zonesCount?: number;
    modulesCount?: number;
    netsCount?: number;
  };
  paper?: string;
  titleBlock?: {
    title?: string;
    date?: string;
    rev?: string;
    company?: string;
    comment?: string[];
  };
  layers: KiCadLayer[];
  setup?: KiCadSetup;
  designRules?: KiCadDesignRules;
  nets: KiCadNet[];
  netClasses: KiCadNetClass[];
  footprints: KiCadFootprint[];
  segments: KiCadSegment[];
  arcs: KiCadArc[];
  vias: KiCadVia[];
  zones: KiCadZone[];
  graphics: KiCadGraphic[];
  dimensions?: unknown[]; // Dimension objects
  targets?: unknown[];    // Target objects
}
