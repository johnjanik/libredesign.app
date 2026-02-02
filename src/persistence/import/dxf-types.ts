/**
 * DXF Types
 *
 * Type definitions for DXF (Drawing Exchange Format) parsing.
 * Based on AutoCAD DXF Reference (R2018).
 */

/**
 * DXF group code-value pair
 */
export interface DXFGroupCode {
  code: number;
  value: string | number;
}

/**
 * DXF file structure
 */
export interface DXFFile {
  header: DXFHeader;
  tables: DXFTables;
  blocks: DXFBlock[];
  entities: DXFEntity[];
}

/**
 * DXF header variables
 */
export interface DXFHeader {
  version: string; // $ACADVER
  insunits: number; // $INSUNITS (0=unitless, 1=inches, 4=mm, etc.)
  extmin: DXFPoint; // $EXTMIN (drawing extents min)
  extmax: DXFPoint; // $EXTMAX (drawing extents max)
  limmin: DXFPoint; // $LIMMIN (drawing limits min)
  limmax: DXFPoint; // $LIMMAX (drawing limits max)
  ltscale: number; // $LTSCALE (linetype scale)
  textsize: number; // $TEXTSIZE (default text height)
  dimscale: number; // $DIMSCALE (dimension scale factor)
  [key: string]: unknown; // Other header variables
}

/**
 * DXF tables section
 */
export interface DXFTables {
  layers: DXFLayer[];
  linetypes: DXFLinetype[];
  styles: DXFTextStyle[];
  dimstyles: DXFDimStyle[];
}

/**
 * DXF layer definition
 */
export interface DXFLayer {
  name: string;
  color: number; // ACI color (1-255)
  linetype: string;
  lineweight: number;
  frozen: boolean;
  locked: boolean;
  off: boolean;
}

/**
 * DXF linetype definition
 */
export interface DXFLinetype {
  name: string;
  description: string;
  pattern: number[]; // Dash pattern
}

/**
 * DXF text style
 */
export interface DXFTextStyle {
  name: string;
  fontName: string;
  height: number;
  widthFactor: number;
  oblique: number;
}

/**
 * DXF dimension style
 */
export interface DXFDimStyle {
  name: string;
  dimscale: number;
  dimtxt: number;
  dimasz: number;
  dimdec: number;
}

/**
 * DXF block definition
 */
export interface DXFBlock {
  name: string;
  basePoint: DXFPoint;
  entities: DXFEntity[];
}

/**
 * DXF point (2D or 3D)
 */
export interface DXFPoint {
  x: number;
  y: number;
  z?: number;
}

/**
 * DXF color representation
 */
export interface DXFColor {
  aci: number; // AutoCAD Color Index (1-255)
  rgb?: { r: number; g: number; b: number }; // True color
}

/**
 * Base DXF entity
 */
export interface DXFEntityBase {
  type: string;
  handle?: string;
  layer: string;
  color?: DXFColor;
  linetype?: string;
  lineweight?: number;
  visible?: boolean;
}

/**
 * DXF LINE entity
 */
export interface DXFLine extends DXFEntityBase {
  type: 'LINE';
  start: DXFPoint;
  end: DXFPoint;
}

/**
 * DXF CIRCLE entity
 */
export interface DXFCircle extends DXFEntityBase {
  type: 'CIRCLE';
  center: DXFPoint;
  radius: number;
}

/**
 * DXF ARC entity
 */
export interface DXFArc extends DXFEntityBase {
  type: 'ARC';
  center: DXFPoint;
  radius: number;
  startAngle: number; // degrees
  endAngle: number; // degrees
}

/**
 * DXF ELLIPSE entity
 */
export interface DXFEllipse extends DXFEntityBase {
  type: 'ELLIPSE';
  center: DXFPoint;
  majorAxis: DXFPoint; // Endpoint of major axis relative to center
  ratio: number; // Ratio of minor axis to major axis
  startParam: number; // Start parameter (0 = start of major axis)
  endParam: number; // End parameter (2*PI = full ellipse)
}

/**
 * DXF POLYLINE/LWPOLYLINE entity
 */
export interface DXFPolyline extends DXFEntityBase {
  type: 'POLYLINE' | 'LWPOLYLINE';
  vertices: DXFVertex[];
  closed: boolean;
  constantWidth?: number;
}

/**
 * DXF vertex
 */
export interface DXFVertex {
  x: number;
  y: number;
  z?: number;
  bulge?: number; // Arc bulge factor
  startWidth?: number;
  endWidth?: number;
}

/**
 * DXF SPLINE entity
 */
export interface DXFSpline extends DXFEntityBase {
  type: 'SPLINE';
  degree: number;
  closed: boolean;
  controlPoints: DXFPoint[];
  fitPoints: DXFPoint[];
  knots: number[];
  weights?: number[];
}

/**
 * DXF TEXT entity
 */
export interface DXFText extends DXFEntityBase {
  type: 'TEXT';
  position: DXFPoint;
  height: number;
  text: string;
  rotation: number;
  style?: string;
  horizontalJustification?: number;
  verticalJustification?: number;
  widthFactor?: number;
  oblique?: number;
}

/**
 * DXF MTEXT entity (multi-line text)
 */
export interface DXFMText extends DXFEntityBase {
  type: 'MTEXT';
  position: DXFPoint;
  height: number;
  text: string;
  rotation: number;
  width: number;
  attachmentPoint: number;
  style?: string;
}

/**
 * DXF DIMENSION entity
 */
export interface DXFDimension extends DXFEntityBase {
  type: 'DIMENSION';
  dimensionType: number;
  definitionPoint: DXFPoint;
  middlePoint: DXFPoint;
  insertionPoint?: DXFPoint;
  text?: string;
  rotation?: number;
  style?: string;
  linearPoints?: {
    defPoint1: DXFPoint;
    defPoint2: DXFPoint;
  };
  angularPoints?: {
    vertex: DXFPoint;
    point1: DXFPoint;
    point2: DXFPoint;
  };
  radiusPoint?: DXFPoint;
}

/**
 * DXF HATCH entity
 */
export interface DXFHatch extends DXFEntityBase {
  type: 'HATCH';
  patternName: string;
  solid: boolean;
  associative: boolean;
  boundaryPaths: DXFHatchBoundary[];
  patternAngle: number;
  patternScale: number;
}

/**
 * DXF hatch boundary path
 */
export interface DXFHatchBoundary {
  type: 'polyline' | 'edges';
  vertices?: DXFVertex[];
  edges?: DXFHatchEdge[];
}

/**
 * DXF hatch edge
 */
export type DXFHatchEdge =
  | { type: 'line'; start: DXFPoint; end: DXFPoint }
  | { type: 'arc'; center: DXFPoint; radius: number; startAngle: number; endAngle: number }
  | { type: 'ellipse'; center: DXFPoint; majorAxis: DXFPoint; ratio: number; startAngle: number; endAngle: number };

/**
 * DXF INSERT entity (block reference)
 */
export interface DXFInsert extends DXFEntityBase {
  type: 'INSERT';
  blockName: string;
  position: DXFPoint;
  scale: DXFPoint;
  rotation: number;
  columnCount?: number;
  rowCount?: number;
  columnSpacing?: number;
  rowSpacing?: number;
  attributes?: DXFAttribute[];
}

/**
 * DXF attribute (block attribute)
 */
export interface DXFAttribute {
  tag: string;
  value: string;
  position: DXFPoint;
  height: number;
  rotation: number;
}

/**
 * DXF SOLID entity (filled triangle/quadrilateral)
 */
export interface DXFSolid extends DXFEntityBase {
  type: 'SOLID';
  point1: DXFPoint;
  point2: DXFPoint;
  point3: DXFPoint;
  point4?: DXFPoint;
}

/**
 * DXF POINT entity
 */
export interface DXFPointEntity extends DXFEntityBase {
  type: 'POINT';
  position: DXFPoint;
}

/**
 * Union type for all DXF entities
 */
export type DXFEntity =
  | DXFLine
  | DXFCircle
  | DXFArc
  | DXFEllipse
  | DXFPolyline
  | DXFSpline
  | DXFText
  | DXFMText
  | DXFDimension
  | DXFHatch
  | DXFInsert
  | DXFSolid
  | DXFPointEntity;

/**
 * AutoCAD Color Index to RGB mapping (standard colors)
 */
export const ACI_COLORS: Record<number, { r: number; g: number; b: number }> = {
  1: { r: 255, g: 0, b: 0 }, // Red
  2: { r: 255, g: 255, b: 0 }, // Yellow
  3: { r: 0, g: 255, b: 0 }, // Green
  4: { r: 0, g: 255, b: 255 }, // Cyan
  5: { r: 0, g: 0, b: 255 }, // Blue
  6: { r: 255, g: 0, b: 255 }, // Magenta
  7: { r: 255, g: 255, b: 255 }, // White
  8: { r: 128, g: 128, b: 128 }, // Dark gray
  9: { r: 192, g: 192, b: 192 }, // Light gray
  10: { r: 255, g: 0, b: 0 }, // Red
  // Extended colors would continue...
};

/**
 * DXF INSUNITS values
 */
export const DXF_UNITS = {
  0: 'unitless',
  1: 'inches',
  2: 'feet',
  3: 'miles',
  4: 'millimeters',
  5: 'centimeters',
  6: 'meters',
  7: 'kilometers',
  8: 'microinches',
  9: 'mils',
  10: 'yards',
  11: 'angstroms',
  12: 'nanometers',
  13: 'microns',
  14: 'decimeters',
  15: 'decameters',
  16: 'hectometers',
  17: 'gigameters',
  18: 'astronomical_units',
  19: 'light_years',
  20: 'parsecs',
} as const;

/**
 * Get conversion factor from DXF units to millimeters
 */
export function getUnitConversionToMM(insunits: number): number {
  const conversions: Record<number, number> = {
    0: 1, // Unitless - assume 1:1
    1: 25.4, // Inches to mm
    2: 304.8, // Feet to mm
    4: 1, // mm to mm
    5: 10, // cm to mm
    6: 1000, // m to mm
  };
  return conversions[insunits] ?? 1;
}
