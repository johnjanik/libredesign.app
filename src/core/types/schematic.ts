/**
 * Schematic System Types
 *
 * Defines types for electrical schematic capture:
 * - Wires and nets
 * - Junction dots
 * - Net labels and buses
 * - Connectivity information
 */

import type { NodeId } from './common';
import type { Point } from './geometry';
import type { RGBA } from './color';

// =============================================================================
// Wire/Net Types
// =============================================================================

/**
 * Wire segment between two points
 */
export interface WireSegment {
  /** Unique segment ID */
  readonly id: string;
  /** Start point */
  readonly start: Point;
  /** End point */
  readonly end: Point;
  /** Net this wire belongs to */
  readonly netId?: string;
  /** Wire style */
  readonly style: WireStyle;
}

/**
 * Wire visual style
 */
export interface WireStyle {
  /** Wire color */
  readonly color: RGBA;
  /** Wire width in pixels */
  readonly width: number;
  /** Line style */
  readonly lineStyle: 'solid' | 'dashed' | 'dotted';
}

/**
 * Default wire style
 */
export const DEFAULT_WIRE_STYLE: WireStyle = {
  color: { r: 0.0, g: 0.8, b: 0.0, a: 1 },
  width: 2,
  lineStyle: 'solid',
};

/**
 * Net - a set of electrically connected wires
 */
export interface Net {
  /** Unique net ID */
  readonly id: string;
  /** Net name (e.g., "VCC", "GND", "CLK") */
  readonly name: string;
  /** Wire segments in this net */
  readonly wireIds: readonly string[];
  /** Connected pin references */
  readonly connectedPins: readonly PinReference[];
  /** Net properties */
  readonly properties: NetProperties;
}

/**
 * Net properties for electrical analysis
 */
export interface NetProperties {
  /** Is this a power net */
  readonly isPower: boolean;
  /** Is this a ground net */
  readonly isGround: boolean;
  /** Net class (for PCB routing rules) */
  readonly netClass?: string;
  /** Expected voltage level */
  readonly voltage?: string;
}

/**
 * Reference to a component pin
 */
export interface PinReference {
  /** Component instance ID */
  readonly componentId: NodeId;
  /** Pin identifier within component */
  readonly pinId: string;
  /** Pin position (world coordinates) */
  readonly position: Point;
}

// =============================================================================
// Junction Types
// =============================================================================

/**
 * Junction dot at wire intersection
 */
export interface Junction {
  /** Unique junction ID */
  readonly id: string;
  /** Junction position */
  readonly position: Point;
  /** Wire segment IDs connected at this junction */
  readonly connectedWires: readonly string[];
  /** Visual style */
  readonly style: JunctionStyle;
}

/**
 * Junction visual style
 */
export interface JunctionStyle {
  /** Junction dot radius */
  readonly radius: number;
  /** Junction color */
  readonly color: RGBA;
  /** Fill style */
  readonly filled: boolean;
}

/**
 * Default junction style
 */
export const DEFAULT_JUNCTION_STYLE: JunctionStyle = {
  radius: 4,
  color: { r: 0.0, g: 0.8, b: 0.0, a: 1 },
  filled: true,
};

// =============================================================================
// Net Label Types
// =============================================================================

/**
 * Net label - names a wire/net
 */
export interface NetLabel {
  /** Unique label ID */
  readonly id: string;
  /** Label text (net name) */
  readonly text: string;
  /** Label position */
  readonly position: Point;
  /** Rotation angle in degrees */
  readonly rotation: number;
  /** Associated net ID */
  readonly netId?: string;
  /** Label style */
  readonly style: NetLabelStyle;
  /** Label type */
  readonly type: NetLabelType;
}

/**
 * Net label types
 */
export type NetLabelType =
  | 'local'       // Local label (same sheet)
  | 'global'      // Global label (all sheets)
  | 'hierarchical' // Hierarchical port
  | 'power';      // Power symbol

/**
 * Net label visual style
 */
export interface NetLabelStyle {
  /** Font family */
  readonly fontFamily: string;
  /** Font size */
  readonly fontSize: number;
  /** Font weight */
  readonly fontWeight: number;
  /** Text color */
  readonly textColor: RGBA;
  /** Background color (optional) */
  readonly backgroundColor?: RGBA;
  /** Border color (optional) */
  readonly borderColor?: RGBA;
  /** Shape around label */
  readonly shape: 'none' | 'box' | 'flag' | 'diamond';
}

/**
 * Default net label style
 */
export const DEFAULT_NET_LABEL_STYLE: NetLabelStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 10,
  fontWeight: 500,
  textColor: { r: 0.0, g: 0.8, b: 0.0, a: 1 },
  shape: 'none',
};

// =============================================================================
// Bus Types
// =============================================================================

/**
 * Bus - grouped set of nets
 */
export interface Bus {
  /** Unique bus ID */
  readonly id: string;
  /** Bus name (e.g., "DATA[0:7]") */
  readonly name: string;
  /** Net names in this bus */
  readonly netNames: readonly string[];
  /** Bus wire segments */
  readonly wireIds: readonly string[];
  /** Bus style */
  readonly style: BusStyle;
}

/**
 * Bus visual style
 */
export interface BusStyle {
  /** Bus line color */
  readonly color: RGBA;
  /** Bus line width (typically thicker than wires) */
  readonly width: number;
}

/**
 * Default bus style
 */
export const DEFAULT_BUS_STYLE: BusStyle = {
  color: { r: 0.0, g: 0.5, b: 1.0, a: 1 },
  width: 3,
};

/**
 * Bus entry - connection from bus to wire
 */
export interface BusEntry {
  /** Unique entry ID */
  readonly id: string;
  /** Entry position on bus */
  readonly busPosition: Point;
  /** Wire connection point */
  readonly wirePosition: Point;
  /** Associated bus ID */
  readonly busId: string;
  /** Associated net name */
  readonly netName: string;
}

// =============================================================================
// Schematic Sheet Types
// =============================================================================

/**
 * Schematic sheet containing components and wires
 */
export interface SchematicSheet {
  /** Sheet ID */
  readonly id: string;
  /** Sheet name */
  readonly name: string;
  /** Sheet number */
  readonly number: number;
  /** Sheet size */
  readonly size: SheetSize;
  /** Wires on this sheet */
  readonly wires: readonly WireSegment[];
  /** Junctions on this sheet */
  readonly junctions: readonly Junction[];
  /** Net labels on this sheet */
  readonly netLabels: readonly NetLabel[];
  /** Buses on this sheet */
  readonly buses: readonly Bus[];
  /** Bus entries on this sheet */
  readonly busEntries: readonly BusEntry[];
  /** Component instances on this sheet */
  readonly componentIds: readonly NodeId[];
}

/**
 * Standard sheet sizes
 */
export type SheetSize =
  | 'A4'
  | 'A3'
  | 'A2'
  | 'A1'
  | 'A0'
  | 'Letter'
  | 'Legal'
  | 'Tabloid'
  | 'custom';

/**
 * Sheet dimensions in mm
 */
export const SHEET_DIMENSIONS: Record<SheetSize, { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
  A2: { width: 594, height: 420 },
  A1: { width: 841, height: 594 },
  A0: { width: 1189, height: 841 },
  Letter: { width: 279.4, height: 215.9 },
  Legal: { width: 355.6, height: 215.9 },
  Tabloid: { width: 431.8, height: 279.4 },
  custom: { width: 297, height: 210 },
};

// =============================================================================
// Connectivity Types
// =============================================================================

/**
 * Connection point on a component
 */
export interface SchematicPin {
  /** Pin ID within component */
  readonly id: string;
  /** Pin name */
  readonly name: string;
  /** Pin number (for ICs) */
  readonly number?: string;
  /** Pin position relative to component origin */
  readonly position: Point;
  /** Pin direction for auto-routing */
  readonly direction: PinDirection;
  /** Electrical type */
  readonly electricalType: PinElectricalType;
  /** Pin length */
  readonly length: number;
}

/**
 * Pin direction for wire routing
 */
export type PinDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Pin electrical type for ERC
 */
export type PinElectricalType =
  | 'input'
  | 'output'
  | 'bidirectional'
  | 'tristate'
  | 'passive'
  | 'power_in'
  | 'power_out'
  | 'open_collector'
  | 'open_emitter'
  | 'no_connect';

/**
 * Electrical Rule Check (ERC) error
 */
export interface ERCError {
  /** Error type */
  readonly type: ERCErrorType;
  /** Error severity */
  readonly severity: 'error' | 'warning' | 'info';
  /** Error message */
  readonly message: string;
  /** Location of error */
  readonly position: Point;
  /** Related net (if applicable) */
  readonly netId?: string;
  /** Related pins (if applicable) */
  readonly pinRefs?: readonly PinReference[];
}

/**
 * ERC error types
 */
export type ERCErrorType =
  | 'unconnected_pin'
  | 'unconnected_wire'
  | 'multiple_drivers'
  | 'no_driver'
  | 'power_not_driven'
  | 'different_net_names'
  | 'floating_input';

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a wire segment
 */
export function createWireSegment(
  start: Point,
  end: Point,
  style: Partial<WireStyle> = {}
): WireSegment {
  return {
    id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    start,
    end,
    style: { ...DEFAULT_WIRE_STYLE, ...style },
  };
}

/**
 * Create a junction
 */
export function createJunction(
  position: Point,
  connectedWires: string[] = [],
  style: Partial<JunctionStyle> = {}
): Junction {
  return {
    id: `junc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    position,
    connectedWires,
    style: { ...DEFAULT_JUNCTION_STYLE, ...style },
  };
}

/**
 * Create a net label
 */
export function createNetLabel(
  text: string,
  position: Point,
  options: {
    type?: NetLabelType;
    rotation?: number;
    style?: Partial<NetLabelStyle>;
  } = {}
): NetLabel {
  return {
    id: `label-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    text,
    position,
    rotation: options.rotation ?? 0,
    type: options.type ?? 'local',
    style: { ...DEFAULT_NET_LABEL_STYLE, ...options.style },
  };
}

/**
 * Create a net
 */
export function createNet(
  name: string,
  properties: Partial<NetProperties> = {}
): Net {
  return {
    id: `net-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    wireIds: [],
    connectedPins: [],
    properties: {
      isPower: properties.isPower ?? false,
      isGround: properties.isGround ?? false,
      ...(properties.netClass !== undefined && { netClass: properties.netClass }),
      ...(properties.voltage !== undefined && { voltage: properties.voltage }),
    },
  };
}

/**
 * Create a bus
 */
export function createBus(
  name: string,
  netNames: string[],
  style: Partial<BusStyle> = {}
): Bus {
  return {
    id: `bus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    netNames,
    wireIds: [],
    style: { ...DEFAULT_BUS_STYLE, ...style },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if two points are close enough to be considered connected
 */
export function pointsConnect(p1: Point, p2: Point, tolerance: number = 5): boolean {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) <= tolerance;
}

/**
 * Check if a point is on a wire segment
 */
export function pointOnWire(point: Point, wire: WireSegment, tolerance: number = 5): boolean {
  const { start, end } = wire;

  // Check if point is within bounding box (expanded by tolerance)
  const minX = Math.min(start.x, end.x) - tolerance;
  const maxX = Math.max(start.x, end.x) + tolerance;
  const minY = Math.min(start.y, end.y) - tolerance;
  const maxY = Math.max(start.y, end.y) + tolerance;

  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
    return false;
  }

  // Calculate perpendicular distance to line
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 1e-10) {
    return pointsConnect(point, start, tolerance);
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)
  ));

  const closest = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  return pointsConnect(point, closest, tolerance);
}

/**
 * Find intersection point of two wire segments
 */
export function wireIntersection(wire1: WireSegment, wire2: WireSegment): Point | null {
  const x1 = wire1.start.x, y1 = wire1.start.y;
  const x2 = wire1.end.x, y2 = wire1.end.y;
  const x3 = wire2.start.x, y3 = wire2.start.y;
  const x4 = wire2.end.x, y4 = wire2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * Parse bus name to extract net names
 * e.g., "DATA[0:7]" -> ["DATA0", "DATA1", ..., "DATA7"]
 */
export function parseBusName(busName: string): string[] {
  const match = busName.match(/^(.+)\[(\d+):(\d+)\]$/);
  if (!match) return [busName];

  const [, prefix, startStr, endStr] = match;
  const start = parseInt(startStr!, 10);
  const end = parseInt(endStr!, 10);

  const names: string[] = [];
  const step = start <= end ? 1 : -1;
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    names.push(`${prefix}${i}`);
  }

  return names;
}
