/**
 * PCB (Printed Circuit Board) Types
 *
 * Defines types for PCB design:
 * - Board outline and layers
 * - Copper traces and tracks
 * - Vias (through-hole, blind, buried)
 * - Pads and footprints
 * - Design rules
 */

import type { NodeId } from './common';
import type { Point } from './geometry';
import type { RGBA } from './color';

// =============================================================================
// Board Definition
// =============================================================================

/**
 * PCB Board definition
 */
export interface PCBBoard {
  /** Board identifier */
  readonly id: string;
  /** Board name */
  readonly name: string;
  /** Board outline (closed polygon) */
  readonly outline: Point[];
  /** Board dimensions (bounding box) */
  readonly width: number;
  readonly height: number;
  /** Layer stackup */
  readonly layers: PCBLayerStackup;
  /** Board thickness in mm */
  readonly thickness: number;
  /** Units for measurements */
  readonly units: PCBUnits;
  /** Design rules */
  readonly designRules: DesignRules;
  /** Grid settings */
  readonly grid: PCBGrid;
}

/**
 * PCB measurement units
 */
export type PCBUnits = 'mm' | 'mil' | 'inch';

/**
 * Grid settings for PCB design
 */
export interface PCBGrid {
  /** Grid size for placement */
  readonly size: number;
  /** Grid units */
  readonly units: PCBUnits;
  /** Snap to grid enabled */
  readonly snapEnabled: boolean;
  /** Show grid */
  readonly visible: boolean;
}

// =============================================================================
// Layer System
// =============================================================================

/**
 * PCB Layer types
 */
export type PCBLayerType =
  | 'copper'           // Conductive copper layer
  | 'silkscreen'       // Component markings
  | 'soldermask'       // Solder resist
  | 'solderpaste'      // Solder paste stencil
  | 'mechanical'       // Board outline, keepouts
  | 'documentation';   // Assembly drawings, notes

/**
 * Standard layer names
 */
export type StandardLayerName =
  | 'F.Cu'           // Front copper (top)
  | 'B.Cu'           // Back copper (bottom)
  | 'In1.Cu'         // Inner copper 1
  | 'In2.Cu'         // Inner copper 2
  | 'In3.Cu'         // Inner copper 3
  | 'In4.Cu'         // Inner copper 4
  | 'F.SilkS'        // Front silkscreen
  | 'B.SilkS'        // Back silkscreen
  | 'F.Mask'         // Front soldermask
  | 'B.Mask'         // Back soldermask
  | 'F.Paste'        // Front paste
  | 'B.Paste'        // Back paste
  | 'Edge.Cuts'      // Board outline
  | 'Dwgs.User'      // User drawings
  | 'Cmts.User';     // User comments

/**
 * PCB Layer definition
 */
export interface PCBLayer {
  /** Layer identifier */
  readonly id: string;
  /** Layer name */
  readonly name: string;
  /** Layer type */
  readonly type: PCBLayerType;
  /** Display color */
  readonly color: RGBA;
  /** Is layer visible */
  readonly visible: boolean;
  /** Is layer locked */
  readonly locked: boolean;
  /** Layer order (0 = top) */
  readonly order: number;
  /** Copper weight in oz (for copper layers) */
  readonly copperWeight?: number;
}

/**
 * Layer stackup - defines all layers in the board
 */
export interface PCBLayerStackup {
  /** Number of copper layers */
  readonly copperLayers: number;
  /** All layer definitions */
  readonly layers: PCBLayer[];
  /** Active layer ID */
  readonly activeLayerId: string;
}

/**
 * Default 2-layer stackup
 */
export function createDefaultStackup(): PCBLayerStackup {
  return {
    copperLayers: 2,
    activeLayerId: 'F.Cu',
    layers: [
      { id: 'F.Cu', name: 'Front Copper', type: 'copper', color: { r: 0.8, g: 0.2, b: 0.2, a: 0.8 }, visible: true, locked: false, order: 0, copperWeight: 1 },
      { id: 'B.Cu', name: 'Back Copper', type: 'copper', color: { r: 0.2, g: 0.2, b: 0.8, a: 0.8 }, visible: true, locked: false, order: 1, copperWeight: 1 },
      { id: 'F.SilkS', name: 'Front Silkscreen', type: 'silkscreen', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, locked: false, order: 2 },
      { id: 'B.SilkS', name: 'Back Silkscreen', type: 'silkscreen', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, locked: false, order: 3 },
      { id: 'F.Mask', name: 'Front Soldermask', type: 'soldermask', color: { r: 0, g: 0.5, b: 0, a: 0.5 }, visible: true, locked: false, order: 4 },
      { id: 'B.Mask', name: 'Back Soldermask', type: 'soldermask', color: { r: 0, g: 0.4, b: 0, a: 0.5 }, visible: true, locked: false, order: 5 },
      { id: 'F.Paste', name: 'Front Paste', type: 'solderpaste', color: { r: 0.7, g: 0.7, b: 0.7, a: 0.5 }, visible: false, locked: false, order: 6 },
      { id: 'B.Paste', name: 'Back Paste', type: 'solderpaste', color: { r: 0.6, g: 0.6, b: 0.6, a: 0.5 }, visible: false, locked: false, order: 7 },
      { id: 'Edge.Cuts', name: 'Board Outline', type: 'mechanical', color: { r: 1, g: 1, b: 0, a: 1 }, visible: true, locked: false, order: 8 },
      { id: 'Dwgs.User', name: 'User Drawings', type: 'documentation', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, locked: false, order: 9 },
    ],
  };
}

/**
 * Create 4-layer stackup
 */
export function create4LayerStackup(): PCBLayerStackup {
  const base = createDefaultStackup();
  return {
    ...base,
    copperLayers: 4,
    layers: [
      ...base.layers.slice(0, 1),
      { id: 'In1.Cu', name: 'Inner Copper 1', type: 'copper', color: { r: 0.8, g: 0.8, b: 0.2, a: 0.8 }, visible: true, locked: false, order: 1, copperWeight: 1 },
      { id: 'In2.Cu', name: 'Inner Copper 2', type: 'copper', color: { r: 0.2, g: 0.8, b: 0.8, a: 0.8 }, visible: true, locked: false, order: 2, copperWeight: 1 },
      ...base.layers.slice(1).map(l => ({ ...l, order: l.order + 2 })),
    ],
  };
}

// =============================================================================
// Tracks (Traces)
// =============================================================================

/**
 * PCB Track (copper trace)
 */
export interface PCBTrack {
  /** Track identifier */
  readonly id: NodeId;
  /** Track type */
  readonly type: 'TRACK';
  /** Net name this track belongs to */
  readonly net: string;
  /** Layer this track is on */
  readonly layer: string;
  /** Track width in mm */
  readonly width: number;
  /** Track segments (polyline) */
  readonly segments: TrackSegment[];
  /** Is track locked */
  readonly locked: boolean;
}

/**
 * Track segment - straight line or arc
 */
export interface TrackSegment {
  /** Segment type */
  readonly type: 'line' | 'arc';
  /** Start point */
  readonly start: Point;
  /** End point */
  readonly end: Point;
  /** Arc center (for arc segments) */
  readonly center?: Point;
  /** Arc direction (for arc segments) */
  readonly clockwise?: boolean;
}

// =============================================================================
// Vias
// =============================================================================

/**
 * Via types
 */
export type ViaType =
  | 'through'    // Through-hole (all layers)
  | 'blind'      // Connects outer to inner layer
  | 'buried'     // Connects inner layers only
  | 'micro';     // Microvia (laser drilled)

/**
 * PCB Via
 */
export interface PCBVia {
  /** Via identifier */
  readonly id: NodeId;
  /** Via type marker */
  readonly type: 'VIA';
  /** Net name */
  readonly net: string;
  /** Via type */
  readonly viaType: ViaType;
  /** Via position */
  readonly position: Point;
  /** Via drill diameter in mm */
  readonly drill: number;
  /** Via pad diameter in mm */
  readonly diameter: number;
  /** Start layer (for blind/buried) */
  readonly startLayer: string;
  /** End layer (for blind/buried) */
  readonly endLayer: string;
  /** Thermal relief settings */
  readonly thermalRelief?: ThermalRelief;
  /** Is via tented (covered by soldermask) */
  readonly tented: boolean;
  /** Is via locked */
  readonly locked: boolean;
}

/**
 * Thermal relief for connections to copper pours
 */
export interface ThermalRelief {
  /** Spoke count */
  readonly spokes: number;
  /** Spoke width in mm */
  readonly spokeWidth: number;
  /** Gap width in mm */
  readonly gap: number;
}

// =============================================================================
// Pads
// =============================================================================

/**
 * Pad shape types
 */
export type PadShape =
  | 'circle'
  | 'rect'
  | 'roundrect'
  | 'oval'
  | 'trapezoid'
  | 'custom';

/**
 * Pad type
 */
export type PadType =
  | 'thru_hole'     // Through-hole pad
  | 'smd'           // Surface mount
  | 'connect'       // For edge connectors
  | 'np_thru_hole'; // Non-plated through-hole

/**
 * PCB Pad
 */
export interface PCBPad {
  /** Pad identifier */
  readonly id: NodeId;
  /** Pad type marker */
  readonly type: 'PAD';
  /** Pad number/name (e.g., "1", "A1", "GND") */
  readonly number: string;
  /** Net name */
  readonly net: string;
  /** Pad type */
  readonly padType: PadType;
  /** Pad shape */
  readonly shape: PadShape;
  /** Position relative to footprint origin */
  readonly position: Point;
  /** Rotation in degrees */
  readonly rotation: number;
  /** Pad size (width x height) in mm */
  readonly size: { width: number; height: number };
  /** Drill size for through-hole pads in mm */
  readonly drill?: { width: number; height: number; shape: 'circle' | 'oval' };
  /** Corner radius ratio for roundrect (0-1) */
  readonly roundRectRatio?: number;
  /** Layers this pad appears on */
  readonly layers: string[];
  /** Soldermask expansion in mm */
  readonly soldermaskMargin?: number;
  /** Paste margin in mm */
  readonly pasteMargin?: number;
  /** Paste ratio (0-1) */
  readonly pasteRatio?: number;
  /** Thermal relief settings */
  readonly thermalRelief?: ThermalRelief;
  /** Custom shape outline (for custom pads) */
  readonly customShape?: Point[];
}

// =============================================================================
// Footprints (Component Packages)
// =============================================================================

/**
 * Component footprint definition
 */
export interface PCBFootprint {
  /** Footprint identifier */
  readonly id: string;
  /** Footprint name (e.g., "SOIC-8", "0805") */
  readonly name: string;
  /** Description */
  readonly description?: string;
  /** Footprint category */
  readonly category: FootprintCategory;
  /** Keywords for search */
  readonly keywords: string[];
  /** Reference designator prefix (R, C, U, etc.) */
  readonly refDesPrefix: string;
  /** Pads in this footprint */
  readonly pads: PCBPad[];
  /** Silkscreen graphics */
  readonly silkscreen: FootprintGraphic[];
  /** Courtyard (component keepout area) */
  readonly courtyard: Point[];
  /** Fabrication layer graphics */
  readonly fabrication: FootprintGraphic[];
  /** 3D model reference */
  readonly model3D?: string;
  /** Footprint origin */
  readonly origin: Point;
  /** Text fields (reference, value) */
  readonly textFields: FootprintText[];
}

/**
 * Footprint categories
 */
export type FootprintCategory =
  | 'smd-chip'          // SMD chip resistors, caps (0201, 0402, 0603, 0805, 1206, etc.)
  | 'smd-ic'            // SMD ICs (SOIC, SSOP, TSSOP, QFP, QFN, BGA)
  | 'smd-discrete'      // SMD transistors, diodes (SOT-23, SOT-223, etc.)
  | 'thru-hole-ic'      // Through-hole ICs (DIP)
  | 'thru-hole-passive' // Through-hole passives (axial, radial)
  | 'thru-hole-discrete'// Through-hole transistors (TO-92, TO-220)
  | 'connector'         // Connectors (headers, USB, barrel)
  | 'mounting'          // Mounting holes
  | 'custom';

/**
 * Graphic element on a footprint
 */
export interface FootprintGraphic {
  /** Graphic type */
  readonly type: 'line' | 'rect' | 'circle' | 'arc' | 'polygon' | 'text';
  /** Layer */
  readonly layer: string;
  /** Line width */
  readonly width: number;
  /** Fill mode */
  readonly fill: 'none' | 'solid' | 'outline';
  /** Points/parameters (depends on type) */
  readonly points?: Point[];
  /** Center (for circle/arc) */
  readonly center?: Point;
  /** Radius (for circle) */
  readonly radius?: number;
  /** Start/end angles (for arc) */
  readonly startAngle?: number;
  readonly endAngle?: number;
  /** Text content */
  readonly text?: string;
  /** Font size */
  readonly fontSize?: number;
}

/**
 * Text field on footprint
 */
export interface FootprintText {
  /** Field type */
  readonly type: 'reference' | 'value' | 'user';
  /** Text content */
  readonly text: string;
  /** Position */
  readonly position: Point;
  /** Rotation */
  readonly rotation: number;
  /** Layer */
  readonly layer: string;
  /** Font size */
  readonly fontSize: number;
  /** Is visible */
  readonly visible: boolean;
}

// =============================================================================
// Placed Components
// =============================================================================

/**
 * Component placed on a PCB
 */
export interface PCBComponent {
  /** Component instance ID */
  readonly id: NodeId;
  /** Component type marker */
  readonly type: 'COMPONENT';
  /** Reference designator (e.g., "R1", "U3") */
  readonly reference: string;
  /** Component value (e.g., "10k", "100nF") */
  readonly value: string;
  /** Footprint ID */
  readonly footprintId: string;
  /** Position on board */
  readonly position: Point;
  /** Rotation in degrees */
  readonly rotation: number;
  /** Which side of board (top/bottom) */
  readonly side: 'top' | 'bottom';
  /** Is component locked */
  readonly locked: boolean;
  /** Part number / MPN */
  readonly partNumber?: string;
  /** Manufacturer */
  readonly manufacturer?: string;
  /** Custom attributes */
  readonly attributes?: Record<string, string>;
}

// =============================================================================
// Copper Zones (Pours)
// =============================================================================

/**
 * Copper zone (pour/fill)
 */
export interface PCBZone {
  /** Zone identifier */
  readonly id: NodeId;
  /** Zone type marker */
  readonly type: 'ZONE';
  /** Net name */
  readonly net: string;
  /** Layer */
  readonly layer: string;
  /** Zone outline */
  readonly outline: Point[];
  /** Fill type */
  readonly fillType: 'solid' | 'hatch';
  /** Hatch orientation (for hatch fill) */
  readonly hatchOrientation?: number;
  /** Hatch width */
  readonly hatchWidth?: number;
  /** Minimum width */
  readonly minWidth: number;
  /** Clearance to other nets */
  readonly clearance: number;
  /** Thermal relief settings */
  readonly thermalRelief: ThermalRelief;
  /** Zone priority (higher = filled first) */
  readonly priority: number;
  /** Is zone filled (has calculated fill) */
  readonly filled: boolean;
  /** Filled polygons (calculated) */
  readonly filledPolygons?: Point[][];
  /** Is zone locked */
  readonly locked: boolean;
}

// =============================================================================
// Design Rules
// =============================================================================

/**
 * Design rules for DRC
 */
export interface DesignRules {
  /** Default track width in mm */
  readonly defaultTrackWidth: number;
  /** Minimum track width in mm */
  readonly minTrackWidth: number;
  /** Default clearance in mm */
  readonly defaultClearance: number;
  /** Minimum clearance in mm */
  readonly minClearance: number;
  /** Default via drill in mm */
  readonly defaultViaDrill: number;
  /** Minimum via drill in mm */
  readonly minViaDrill: number;
  /** Default via diameter in mm */
  readonly defaultViaDiameter: number;
  /** Minimum via diameter in mm */
  readonly minViaDiameter: number;
  /** Minimum hole-to-hole distance in mm */
  readonly minHoleToHole: number;
  /** Minimum annular ring in mm */
  readonly minAnnularRing: number;
  /** Minimum silk to pad clearance in mm */
  readonly minSilkToPad: number;
  /** Minimum silk to silk clearance in mm */
  readonly minSilkToSilk: number;
  /** Net-specific rules */
  readonly netRules?: NetDesignRule[];
  /** Net class definitions */
  readonly netClasses?: NetClass[];
}

/**
 * Design rule for specific net
 */
export interface NetDesignRule {
  /** Net name pattern (supports wildcards) */
  readonly netPattern: string;
  /** Track width override */
  readonly trackWidth?: number;
  /** Clearance override */
  readonly clearance?: number;
  /** Via drill override */
  readonly viaDrill?: number;
  /** Via diameter override */
  readonly viaDiameter?: number;
}

/**
 * Net class - group of nets with shared rules
 */
export interface NetClass {
  /** Class name */
  readonly name: string;
  /** Description */
  readonly description?: string;
  /** Track width */
  readonly trackWidth: number;
  /** Clearance */
  readonly clearance: number;
  /** Via drill */
  readonly viaDrill: number;
  /** Via diameter */
  readonly viaDiameter: number;
  /** Member nets */
  readonly nets: string[];
}

/**
 * Default design rules
 */
export function createDefaultDesignRules(): DesignRules {
  return {
    defaultTrackWidth: 0.25,
    minTrackWidth: 0.15,
    defaultClearance: 0.2,
    minClearance: 0.15,
    defaultViaDrill: 0.3,
    minViaDrill: 0.2,
    defaultViaDiameter: 0.6,
    minViaDiameter: 0.4,
    minHoleToHole: 0.25,
    minAnnularRing: 0.15,
    minSilkToPad: 0.15,
    minSilkToSilk: 0.15,
    netClasses: [
      {
        name: 'Default',
        description: 'Default net class',
        trackWidth: 0.25,
        clearance: 0.2,
        viaDrill: 0.3,
        viaDiameter: 0.6,
        nets: [],
      },
      {
        name: 'Power',
        description: 'Power nets (VCC, GND)',
        trackWidth: 0.5,
        clearance: 0.25,
        viaDrill: 0.4,
        viaDiameter: 0.8,
        nets: ['VCC', 'GND', '+5V', '+3.3V', '+12V'],
      },
    ],
  };
}

// =============================================================================
// DRC Violation
// =============================================================================

/**
 * DRC violation types
 */
export type DRCViolationType =
  | 'clearance'       // Objects too close
  | 'track_width'     // Track too narrow
  | 'annular_ring'    // Pad ring too small
  | 'drill_size'      // Hole too small
  | 'hole_to_hole'    // Holes too close
  | 'unconnected'     // Missing connection
  | 'short'           // Short circuit
  | 'silk_overlap'    // Silkscreen overlap
  | 'courtyard';      // Component overlap

/**
 * DRC violation report
 */
export interface DRCViolation {
  /** Violation type */
  readonly type: DRCViolationType;
  /** Severity */
  readonly severity: 'error' | 'warning';
  /** Description */
  readonly description: string;
  /** Location */
  readonly position: Point;
  /** Affected object IDs */
  readonly objectIds: NodeId[];
  /** Affected layers */
  readonly layers: string[];
  /** Rule value (minimum/expected) */
  readonly ruleValue?: number;
  /** Actual value found */
  readonly actualValue?: number;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new PCB board
 */
export function createPCBBoard(
  name: string,
  width: number,
  height: number,
  options: {
    layers?: number;
    units?: PCBUnits;
    thickness?: number;
  } = {}
): PCBBoard {
  const { layers = 2, units = 'mm', thickness = 1.6 } = options;

  return {
    id: `pcb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    outline: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    width,
    height,
    layers: layers === 4 ? create4LayerStackup() : createDefaultStackup(),
    thickness,
    units,
    designRules: createDefaultDesignRules(),
    grid: {
      size: units === 'mm' ? 0.5 : 25, // 0.5mm or 25mil
      units,
      snapEnabled: true,
      visible: true,
    },
  };
}

/**
 * Create a track
 */
export function createPCBTrack(
  net: string,
  layer: string,
  segments: TrackSegment[],
  width: number
): PCBTrack {
  return {
    id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'TRACK',
    net,
    layer,
    width,
    segments,
    locked: false,
  };
}

/**
 * Create a via
 */
export function createPCBVia(
  net: string,
  position: Point,
  options: {
    viaType?: ViaType;
    drill?: number;
    diameter?: number;
    startLayer?: string;
    endLayer?: string;
    tented?: boolean;
  } = {}
): PCBVia {
  const {
    viaType = 'through',
    drill = 0.3,
    diameter = 0.6,
    startLayer = 'F.Cu',
    endLayer = 'B.Cu',
    tented = false,
  } = options;

  return {
    id: `via-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'VIA',
    net,
    viaType,
    position,
    drill,
    diameter,
    startLayer,
    endLayer,
    tented,
    locked: false,
  };
}

/**
 * Create a pad
 */
export function createPCBPad(
  number: string,
  padType: PadType,
  position: Point,
  size: { width: number; height: number },
  options: {
    shape?: PadShape;
    net?: string;
    rotation?: number;
    drill?: { width: number; height: number; shape: 'circle' | 'oval' };
    layers?: string[];
    roundRectRatio?: number;
  } = {}
): PCBPad {
  const {
    shape = padType === 'smd' ? 'rect' : 'circle',
    net = '',
    rotation = 0,
    drill,
    layers = padType === 'smd' ? ['F.Cu', 'F.Paste', 'F.Mask'] : ['*.Cu', '*.Mask'],
    roundRectRatio,
  } = options;

  const pad: PCBPad = {
    id: `pad-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'PAD',
    number,
    net,
    padType,
    shape,
    position,
    rotation,
    size,
    layers,
  };

  if (drill) {
    return { ...pad, drill };
  }
  if (roundRectRatio !== undefined) {
    return { ...pad, roundRectRatio };
  }
  return pad;
}

/**
 * Create a component instance
 */
export function createPCBComponent(
  reference: string,
  footprintId: string,
  position: Point,
  options: {
    value?: string;
    rotation?: number;
    side?: 'top' | 'bottom';
  } = {}
): PCBComponent {
  const { value = '', rotation = 0, side = 'top' } = options;

  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId,
    type: 'COMPONENT',
    reference,
    value,
    footprintId,
    position,
    rotation,
    side,
    locked: false,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert between PCB units
 */
export function convertPCBUnits(value: number, from: PCBUnits, to: PCBUnits): number {
  // Convert to mm first
  let mm = value;
  switch (from) {
    case 'mil':
      mm = value * 0.0254;
      break;
    case 'inch':
      mm = value * 25.4;
      break;
  }

  // Convert from mm to target
  switch (to) {
    case 'mil':
      return mm / 0.0254;
    case 'inch':
      return mm / 25.4;
    default:
      return mm;
  }
}

/**
 * Format PCB measurement for display
 */
export function formatPCBMeasurement(value: number, units: PCBUnits, decimals: number = 3): string {
  return `${value.toFixed(decimals)} ${units}`;
}

/**
 * Get copper layer IDs from stackup
 */
export function getCopperLayers(stackup: PCBLayerStackup): PCBLayer[] {
  return stackup.layers.filter(l => l.type === 'copper');
}

/**
 * Check if a layer is a copper layer
 */
export function isCopperLayer(layerId: string): boolean {
  return layerId.endsWith('.Cu');
}
