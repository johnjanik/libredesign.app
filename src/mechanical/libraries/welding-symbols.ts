/**
 * Welding Symbols Library
 *
 * Comprehensive welding symbol specifications following AWS A2.4 and ISO 2553 standards.
 * Includes weld types, supplementary symbols, and standard welding specifications.
 */

// =============================================================================
// WELD TYPE DEFINITIONS
// =============================================================================

/**
 * Basic weld joint types
 */
export type WeldJointType =
  | 'butt'
  | 'corner'
  | 'tee'
  | 'lap'
  | 'edge';

/**
 * Weld groove types (for butt welds)
 */
export type GrooveType =
  | 'square'
  | 'v-groove'
  | 'bevel'
  | 'u-groove'
  | 'j-groove'
  | 'flare-v'
  | 'flare-bevel';

/**
 * Fillet and other weld types
 */
export type WeldType =
  | 'fillet'
  | 'plug'
  | 'slot'
  | 'spot'
  | 'seam'
  | 'back'
  | 'backing'
  | 'surfacing'
  | 'flange-edge'
  | 'flange-corner'
  | GrooveType;

/**
 * Welding process designations (AWS)
 */
export type WeldingProcess =
  | 'SMAW'   // Shielded Metal Arc Welding
  | 'GMAW'   // Gas Metal Arc Welding (MIG)
  | 'GTAW'   // Gas Tungsten Arc Welding (TIG)
  | 'FCAW'   // Flux-Cored Arc Welding
  | 'SAW'    // Submerged Arc Welding
  | 'PAW'    // Plasma Arc Welding
  | 'ESW'    // Electroslag Welding
  | 'EGW'    // Electrogas Welding
  | 'SW'     // Stud Welding
  | 'OFW'    // Oxyfuel Welding
  | 'RW'     // Resistance Welding
  | 'LBW'    // Laser Beam Welding
  | 'EBW';   // Electron Beam Welding

/**
 * Weld contour types
 */
export type WeldContour = 'flat' | 'convex' | 'concave';

/**
 * Finishing methods for welds
 */
export type FinishingMethod =
  | 'C'   // Chipping
  | 'G'   // Grinding
  | 'H'   // Hammering
  | 'M'   // Machining
  | 'R'   // Rolling
  | 'U';  // Unspecified

// =============================================================================
// SYMBOL SPECIFICATIONS
// =============================================================================

/**
 * Basic weld symbol specification
 */
export interface WeldSymbolSpec {
  id: string;
  name: string;
  type: WeldType;
  description: string;
  // Symbol geometry for rendering
  symbolPath: string;  // SVG path data
  width: number;       // Symbol width in mm
  height: number;      // Symbol height in mm
}

/**
 * Supplementary weld symbols
 */
export interface SupplementarySymbol {
  id: string;
  name: string;
  description: string;
  symbolPath: string;
  width: number;
  height: number;
}

/**
 * Complete welding symbol specification (as shown on drawing)
 */
export interface WeldingSymbolSpec {
  // Arrow side weld
  arrowSide?: {
    type: WeldType;
    size?: number;           // Weld size (leg size for fillet)
    length?: number;         // Weld length
    pitch?: number;          // Center-to-center spacing for intermittent welds
    grooveAngle?: number;    // Groove angle in degrees
    rootOpening?: number;    // Root gap
    depth?: number;          // Depth of penetration
    contour?: WeldContour;
    finish?: FinishingMethod;
  };

  // Other side weld
  otherSide?: {
    type: WeldType;
    size?: number;
    length?: number;
    pitch?: number;
    grooveAngle?: number;
    rootOpening?: number;
    depth?: number;
    contour?: WeldContour;
    finish?: FinishingMethod;
  };

  // Tail information
  process?: WeldingProcess;
  specification?: string;    // Welding procedure specification
  notes?: string;

  // Supplementary symbols
  fieldWeld?: boolean;       // Weld in field (not in shop)
  weldAllAround?: boolean;   // Continuous weld around joint
  meltThrough?: boolean;     // Complete joint penetration with melt-through
  backingBar?: boolean;      // Backing bar used
  spacer?: boolean;          // Spacer used

  // Staggered welds
  staggered?: boolean;
}

// =============================================================================
// STANDARD WELD SYMBOLS (SVG Paths)
// =============================================================================

/**
 * Basic weld type symbols
 * All symbols are designed for a 10x10 unit baseline reference
 */
export const WELD_TYPE_SYMBOLS: WeldSymbolSpec[] = [
  // Groove welds
  {
    id: 'square-groove',
    name: 'Square Groove',
    type: 'square',
    description: 'Square groove weld - no edge preparation',
    symbolPath: 'M0,10 L0,0 L10,0 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'v-groove',
    name: 'V-Groove',
    type: 'v-groove',
    description: 'V-groove weld - both edges beveled',
    symbolPath: 'M0,10 L5,0 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'bevel-groove',
    name: 'Bevel Groove',
    type: 'bevel',
    description: 'Bevel groove weld - one edge beveled',
    symbolPath: 'M0,10 L0,0 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'u-groove',
    name: 'U-Groove',
    type: 'u-groove',
    description: 'U-groove weld - curved bottom',
    symbolPath: 'M0,10 L0,4 Q5,0 10,4 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'j-groove',
    name: 'J-Groove',
    type: 'j-groove',
    description: 'J-groove weld - one side curved',
    symbolPath: 'M0,10 L0,0 Q5,0 10,4 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'flare-v-groove',
    name: 'Flare-V Groove',
    type: 'flare-v',
    description: 'Flare-V groove weld - for round stock',
    symbolPath: 'M0,10 Q0,0 5,0 Q10,0 10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'flare-bevel-groove',
    name: 'Flare-Bevel Groove',
    type: 'flare-bevel',
    description: 'Flare-bevel groove weld - round to flat',
    symbolPath: 'M0,10 L0,0 Q5,0 10,10',
    width: 10,
    height: 10,
  },

  // Fillet and other welds
  {
    id: 'fillet',
    name: 'Fillet',
    type: 'fillet',
    description: 'Fillet weld - triangular cross-section',
    symbolPath: 'M0,10 L10,10 L0,0 Z',
    width: 10,
    height: 10,
  },
  {
    id: 'plug-weld',
    name: 'Plug Weld',
    type: 'plug',
    description: 'Plug weld - through circular hole',
    symbolPath: 'M0,10 L5,0 L10,10 M4,10 L4,5 L6,5 L6,10',
    width: 10,
    height: 10,
  },
  {
    id: 'slot-weld',
    name: 'Slot Weld',
    type: 'slot',
    description: 'Slot weld - through elongated hole',
    symbolPath: 'M0,10 L5,0 L10,10 M2,10 L2,5 L8,5 L8,10',
    width: 10,
    height: 10,
  },
  {
    id: 'spot-weld',
    name: 'Spot Weld',
    type: 'spot',
    description: 'Spot weld - resistance welding',
    symbolPath: 'M5,5 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
    width: 10,
    height: 10,
  },
  {
    id: 'seam-weld',
    name: 'Seam Weld',
    type: 'seam',
    description: 'Seam weld - continuous resistance welding',
    symbolPath: 'M5,5 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M1,5 L9,5',
    width: 10,
    height: 10,
  },
  {
    id: 'back-weld',
    name: 'Back Weld',
    type: 'back',
    description: 'Back weld - applied after groove weld',
    symbolPath: 'M0,5 Q5,0 10,5 L10,10 L0,10 Z',
    width: 10,
    height: 10,
  },
  {
    id: 'backing-weld',
    name: 'Backing Weld',
    type: 'backing',
    description: 'Backing weld - applied before groove weld',
    symbolPath: 'M0,10 L0,5 Q5,0 10,5 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'surfacing-weld',
    name: 'Surfacing',
    type: 'surfacing',
    description: 'Surfacing weld - buildup or overlay',
    symbolPath: 'M0,10 L0,5 L10,5 L10,10 M2,5 L2,3 M5,5 L5,3 M8,5 L8,3',
    width: 10,
    height: 10,
  },
  {
    id: 'flange-edge',
    name: 'Edge Flange',
    type: 'flange-edge',
    description: 'Edge flange weld',
    symbolPath: 'M0,10 L0,5 Q0,0 5,0 L10,0 L10,10',
    width: 10,
    height: 10,
  },
  {
    id: 'flange-corner',
    name: 'Corner Flange',
    type: 'flange-corner',
    description: 'Corner flange weld',
    symbolPath: 'M0,10 L0,5 Q0,0 5,0 L5,10',
    width: 10,
    height: 10,
  },
];

/**
 * Supplementary symbols
 */
export const SUPPLEMENTARY_SYMBOLS: SupplementarySymbol[] = [
  {
    id: 'weld-all-around',
    name: 'Weld All Around',
    description: 'Continuous weld around entire joint',
    symbolPath: 'M5,5 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
    width: 10,
    height: 10,
  },
  {
    id: 'field-weld',
    name: 'Field Weld',
    description: 'Weld to be made in field (not shop)',
    symbolPath: 'M5,10 L5,0 M0,0 L5,5 L10,0',
    width: 10,
    height: 10,
  },
  {
    id: 'melt-through',
    name: 'Melt Through',
    description: 'Complete joint penetration with visible melt-through',
    symbolPath: 'M0,5 Q5,10 10,5 Q5,0 0,5',
    width: 10,
    height: 10,
  },
  {
    id: 'backing-bar',
    name: 'Backing Bar',
    description: 'Backing bar or strip used',
    symbolPath: 'M0,7 L10,7 L10,10 L0,10 Z',
    width: 10,
    height: 10,
  },
  {
    id: 'spacer',
    name: 'Spacer',
    description: 'Spacer used in joint',
    symbolPath: 'M3,0 L7,0 L7,10 L3,10 Z',
    width: 10,
    height: 10,
  },
  {
    id: 'contour-flat',
    name: 'Flat Contour',
    description: 'Weld face to be finished flat',
    symbolPath: 'M0,5 L10,5',
    width: 10,
    height: 5,
  },
  {
    id: 'contour-convex',
    name: 'Convex Contour',
    description: 'Weld face to be convex',
    symbolPath: 'M0,5 Q5,0 10,5',
    width: 10,
    height: 5,
  },
  {
    id: 'contour-concave',
    name: 'Concave Contour',
    description: 'Weld face to be concave',
    symbolPath: 'M0,5 Q5,10 10,5',
    width: 10,
    height: 5,
  },
];

// =============================================================================
// STANDARD WELD SIZES
// =============================================================================

/**
 * Standard fillet weld sizes (leg size in mm)
 */
export const STANDARD_FILLET_SIZES = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25];

/**
 * Standard groove angles (degrees)
 */
export const STANDARD_GROOVE_ANGLES = [30, 35, 37.5, 45, 60, 90];

/**
 * Standard root openings (mm)
 */
export const STANDARD_ROOT_OPENINGS = [0, 1, 1.5, 2, 3, 4, 5, 6];

/**
 * Standard root faces (mm)
 */
export const STANDARD_ROOT_FACES = [0, 1, 1.5, 2, 3];

// =============================================================================
// WELDING PROCESS SPECIFICATIONS
// =============================================================================

/**
 * Welding process details
 */
export interface WeldingProcessSpec {
  code: WeldingProcess;
  name: string;
  description: string;
  shieldingGas?: string[];
  electrodeTypes?: string[];
  typicalApplications: string[];
}

export const WELDING_PROCESSES: WeldingProcessSpec[] = [
  {
    code: 'SMAW',
    name: 'Shielded Metal Arc Welding',
    description: 'Manual arc welding with consumable electrode coated in flux',
    electrodeTypes: ['E6010', 'E6011', 'E6013', 'E7018', 'E7024'],
    typicalApplications: ['Structural steel', 'Pipelines', 'Repair work', 'Field welding'],
  },
  {
    code: 'GMAW',
    name: 'Gas Metal Arc Welding (MIG)',
    description: 'Wire-fed welding with shielding gas',
    shieldingGas: ['Argon', 'CO2', 'Argon-CO2 mix'],
    typicalApplications: ['Sheet metal', 'Automotive', 'Production welding'],
  },
  {
    code: 'GTAW',
    name: 'Gas Tungsten Arc Welding (TIG)',
    description: 'Non-consumable tungsten electrode with shielding gas',
    shieldingGas: ['Argon', 'Helium', 'Argon-Helium mix'],
    typicalApplications: ['Aerospace', 'Thin materials', 'Stainless steel', 'Aluminum'],
  },
  {
    code: 'FCAW',
    name: 'Flux-Cored Arc Welding',
    description: 'Wire-fed welding with flux-cored electrode',
    shieldingGas: ['CO2', 'Argon-CO2 mix', 'Self-shielded'],
    typicalApplications: ['Structural steel', 'Shipbuilding', 'Heavy fabrication'],
  },
  {
    code: 'SAW',
    name: 'Submerged Arc Welding',
    description: 'Arc submerged under granular flux blanket',
    typicalApplications: ['Heavy plate', 'Pressure vessels', 'Pipe manufacturing'],
  },
  {
    code: 'PAW',
    name: 'Plasma Arc Welding',
    description: 'Constricted arc plasma welding',
    shieldingGas: ['Argon', 'Argon-Hydrogen'],
    typicalApplications: ['Precision welding', 'Titanium', 'Keyhole welding'],
  },
  {
    code: 'RW',
    name: 'Resistance Welding',
    description: 'Welding using electrical resistance heating',
    typicalApplications: ['Sheet metal', 'Automotive', 'Appliances'],
  },
  {
    code: 'LBW',
    name: 'Laser Beam Welding',
    description: 'High-energy laser beam welding',
    typicalApplications: ['Precision components', 'Automotive', 'Electronics'],
  },
  {
    code: 'EBW',
    name: 'Electron Beam Welding',
    description: 'High-energy electron beam in vacuum',
    typicalApplications: ['Aerospace', 'Nuclear', 'High-precision components'],
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get weld symbol by type
 */
export function getWeldSymbol(type: WeldType): WeldSymbolSpec | undefined {
  return WELD_TYPE_SYMBOLS.find((s) => s.type === type);
}

/**
 * Get weld symbol by ID
 */
export function getWeldSymbolById(id: string): WeldSymbolSpec | undefined {
  return WELD_TYPE_SYMBOLS.find((s) => s.id === id);
}

/**
 * Get supplementary symbol by ID
 */
export function getSupplementarySymbol(id: string): SupplementarySymbol | undefined {
  return SUPPLEMENTARY_SYMBOLS.find((s) => s.id === id);
}

/**
 * Get welding process by code
 */
export function getWeldingProcess(code: WeldingProcess): WeldingProcessSpec | undefined {
  return WELDING_PROCESSES.find((p) => p.code === code);
}

/**
 * Calculate throat thickness for fillet weld
 * @param legSize - Fillet weld leg size
 * @returns Theoretical throat thickness
 */
export function calculateFilletThroat(legSize: number): number {
  return legSize * Math.SQRT1_2; // legSize * 0.707
}

/**
 * Calculate effective throat for groove weld
 * @param plateThickness - Thickness of thinner plate
 * @param rootOpening - Root opening/gap
 * @param grooveDepth - Depth of groove preparation
 * @returns Effective throat
 */
export function calculateGrooveThroat(
  plateThickness: number,
  rootOpening: number = 0,
  grooveDepth?: number
): number {
  const depth = grooveDepth ?? plateThickness;
  return depth + rootOpening;
}

/**
 * Calculate minimum fillet weld size based on plate thickness (AWS D1.1)
 * @param plateThickness - Thickness of thicker plate in mm
 * @returns Minimum fillet weld leg size in mm
 */
export function getMinimumFilletSize(plateThickness: number): number {
  if (plateThickness <= 6) return 3;
  if (plateThickness <= 13) return 5;
  if (plateThickness <= 19) return 6;
  return 8;
}

/**
 * Calculate maximum fillet weld size (AWS D1.1)
 * @param plateThickness - Thickness of thinner plate in mm
 * @returns Maximum fillet weld leg size in mm
 */
export function getMaximumFilletSize(plateThickness: number): number {
  if (plateThickness < 6) return plateThickness;
  return plateThickness - 2;
}

/**
 * Generate welding symbol notation string
 */
export function formatWeldingSymbol(spec: WeldingSymbolSpec): string {
  const parts: string[] = [];

  if (spec.arrowSide) {
    const arrow = spec.arrowSide;
    let arrowStr = arrow.type;
    if (arrow.size) arrowStr += ` ${arrow.size}`;
    if (arrow.length && arrow.pitch) {
      arrowStr += ` ${arrow.length}-${arrow.pitch}`;
    } else if (arrow.length) {
      arrowStr += ` L${arrow.length}`;
    }
    parts.push(`Arrow: ${arrowStr}`);
  }

  if (spec.otherSide) {
    const other = spec.otherSide;
    let otherStr = other.type;
    if (other.size) otherStr += ` ${other.size}`;
    parts.push(`Other: ${otherStr}`);
  }

  if (spec.process) {
    parts.push(`Process: ${spec.process}`);
  }

  const supplements: string[] = [];
  if (spec.fieldWeld) supplements.push('Field');
  if (spec.weldAllAround) supplements.push('All Around');
  if (spec.meltThrough) supplements.push('Melt Through');
  if (supplements.length > 0) {
    parts.push(`[${supplements.join(', ')}]`);
  }

  return parts.join(' | ');
}

// =============================================================================
// LIBRARY EXPORT
// =============================================================================

export const WeldingSymbolsLibrary = {
  // Symbol collections
  weldTypes: WELD_TYPE_SYMBOLS,
  supplementarySymbols: SUPPLEMENTARY_SYMBOLS,
  processes: WELDING_PROCESSES,

  // Standard values
  filletSizes: STANDARD_FILLET_SIZES,
  grooveAngles: STANDARD_GROOVE_ANGLES,
  rootOpenings: STANDARD_ROOT_OPENINGS,
  rootFaces: STANDARD_ROOT_FACES,

  // Lookup functions
  getWeldSymbol,
  getWeldSymbolById,
  getSupplementarySymbol,
  getWeldingProcess,

  // Calculation functions
  calculateFilletThroat,
  calculateGrooveThroat,
  getMinimumFilletSize,
  getMaximumFilletSize,
  formatWeldingSymbol,
};
