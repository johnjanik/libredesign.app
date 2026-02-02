/**
 * Electrical Symbols Library
 *
 * Built-in library of common electrical/electronic schematic symbols.
 * Follows IEEE/ANSI standards where applicable.
 */

import type {
  BlockDefinition,
  BlockLibrary,
  BlockAttributeDefinition,
} from '@core/types/block';
import type { SerializedNode } from '@core/types/page-schema';

// =============================================================================
// Helper Functions
// =============================================================================

function createLineNode(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): SerializedNode {
  return {
    id,
    type: 'LINE',
    name: 'Line',
    visible: true,
    locked: false,
    parentId: '',
    childIds: [],
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: [],
    strokes: [
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
    ],
    strokeWeight: 2,
    strokeAlign: 'CENTER',
    strokeCap: 'ROUND',
    strokeJoin: 'ROUND',
    effects: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    x1,
    y1,
    x2,
    y2,
  } as SerializedNode;
}

function createRectNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: boolean = false
): SerializedNode {
  return {
    id,
    type: 'RECTANGLE',
    name: 'Rectangle',
    visible: true,
    locked: false,
    parentId: '',
    childIds: [],
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: fill
      ? [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } }]
      : [],
    strokes: [
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
    ],
    strokeWeight: 2,
    strokeAlign: 'CENTER',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    effects: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    cornerRadius: 0,
  } as SerializedNode;
}

function createEllipseNode(
  id: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: boolean = false
): SerializedNode {
  return {
    id,
    type: 'ELLIPSE',
    name: 'Ellipse',
    visible: true,
    locked: false,
    parentId: '',
    childIds: [],
    x: cx - rx,
    y: cy - ry,
    width: rx * 2,
    height: ry * 2,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: fill
      ? [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } }]
      : [],
    strokes: [
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
    ],
    strokeWeight: 2,
    strokeAlign: 'CENTER',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    effects: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    arcStart: 0,
    arcEnd: 360,
    innerRadius: 0,
  } as SerializedNode;
}

function createTextNode(
  id: string,
  x: number,
  y: number,
  text: string
): SerializedNode {
  return {
    id,
    type: 'TEXT',
    name: text,
    visible: true,
    locked: false,
    parentId: '',
    childIds: [],
    x,
    y,
    width: text.length * 8,
    height: 14,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: [
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
    ],
    strokes: [],
    strokeWeight: 0,
    strokeAlign: 'OUTSIDE',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    effects: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    characters: text,
    styleRanges: [
      {
        start: 0,
        end: text.length,
        fontFamily: 'Inter',
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 'AUTO',
        letterSpacing: 0,
      },
    ],
    textAutoResize: 'WIDTH_AND_HEIGHT',
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
  } as SerializedNode;
}

function createValueAttribute(): BlockAttributeDefinition {
  return {
    tag: 'VALUE',
    prompt: 'Enter component value:',
    defaultValue: '',
    type: 'text',
    position: { x: 20, y: -15 },
    textStyle: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 10,
      fontWeight: 400,
      fontStyle: 'normal',
      color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
      alignment: 'left',
      rotation: 0,
    },
    required: false,
    visible: true,
    constant: false,
    verify: false,
  };
}

function createRefDesAttribute(prefix: string): BlockAttributeDefinition {
  return {
    tag: 'REFDES',
    prompt: 'Enter reference designator:',
    defaultValue: `${prefix}?`,
    type: 'text',
    position: { x: 20, y: 5 },
    textStyle: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 10,
      fontWeight: 600,
      fontStyle: 'normal',
      color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
      alignment: 'left',
      rotation: 0,
    },
    required: true,
    visible: true,
    constant: false,
    verify: false,
  };
}

// =============================================================================
// Passive Components
// =============================================================================

const now = new Date().toISOString();

/**
 * Resistor symbol (US style - zigzag)
 */
const RESISTOR: BlockDefinition = {
  id: 'elec-resistor-us',
  name: 'Resistor (US)',
  description: 'Standard resistor symbol (US zigzag style)',
  category: 'electrical-passive',
  tags: ['resistor', 'R', 'ohm', 'passive'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Left lead
    createLineNode('r-lead1', -30, 0, -20, 0),
    // Zigzag body
    createLineNode('r-z1', -20, 0, -15, -8),
    createLineNode('r-z2', -15, -8, -5, 8),
    createLineNode('r-z3', -5, 8, 5, -8),
    createLineNode('r-z4', 5, -8, 15, 8),
    createLineNode('r-z5', 15, 8, 20, 0),
    // Right lead
    createLineNode('r-lead2', 20, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('R'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Resistor symbol (EU style - rectangle)
 */
const RESISTOR_EU: BlockDefinition = {
  id: 'elec-resistor-eu',
  name: 'Resistor (EU)',
  description: 'Standard resistor symbol (EU rectangle style)',
  category: 'electrical-passive',
  tags: ['resistor', 'R', 'ohm', 'passive', 'european'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('r-lead1', -30, 0, -15, 0),
    createRectNode('r-body', -15, -5, 30, 10),
    createLineNode('r-lead2', 15, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('R'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Capacitor symbol (non-polarized)
 */
const CAPACITOR: BlockDefinition = {
  id: 'elec-capacitor',
  name: 'Capacitor',
  description: 'Non-polarized capacitor symbol',
  category: 'electrical-passive',
  tags: ['capacitor', 'C', 'farad', 'passive'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('c-lead1', -30, 0, -5, 0),
    createLineNode('c-plate1', -5, -12, -5, 12),
    createLineNode('c-plate2', 5, -12, 5, 12),
    createLineNode('c-lead2', 5, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('C'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Polarized capacitor symbol
 */
const CAPACITOR_POLARIZED: BlockDefinition = {
  id: 'elec-capacitor-pol',
  name: 'Capacitor (Polarized)',
  description: 'Polarized/electrolytic capacitor symbol',
  category: 'electrical-passive',
  tags: ['capacitor', 'C', 'farad', 'electrolytic', 'polarized', 'passive'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('c-lead1', -30, 0, -5, 0),
    createLineNode('c-plate1', -5, -12, -5, 12),
    // Curved plate (approximated with lines)
    createLineNode('c-curve1', 5, -12, 8, -6),
    createLineNode('c-curve2', 8, -6, 8, 6),
    createLineNode('c-curve3', 8, 6, 5, 12),
    createLineNode('c-lead2', 8, 0, 30, 0),
    // Plus sign
    createLineNode('c-plus-h', -12, -15, -8, -15),
    createLineNode('c-plus-v', -10, -17, -10, -13),
  ],
  attributes: [
    createRefDesAttribute('C'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Inductor symbol
 */
const INDUCTOR: BlockDefinition = {
  id: 'elec-inductor',
  name: 'Inductor',
  description: 'Inductor/coil symbol',
  category: 'electrical-passive',
  tags: ['inductor', 'L', 'henry', 'coil', 'passive'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('l-lead1', -30, 0, -20, 0),
    // Loops (approximated with arcs using ellipses)
    createEllipseNode('l-loop1', -15, 0, 5, 5),
    createEllipseNode('l-loop2', -5, 0, 5, 5),
    createEllipseNode('l-loop3', 5, 0, 5, 5),
    createEllipseNode('l-loop4', 15, 0, 5, 5),
    createLineNode('l-lead2', 20, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('L'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Diodes
// =============================================================================

/**
 * Diode symbol
 */
const DIODE: BlockDefinition = {
  id: 'elec-diode',
  name: 'Diode',
  description: 'Standard diode symbol',
  category: 'electrical-passive',
  tags: ['diode', 'D', 'rectifier', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('d-lead1', -30, 0, -10, 0),
    // Triangle (anode)
    createLineNode('d-tri1', -10, -10, -10, 10),
    createLineNode('d-tri2', -10, -10, 10, 0),
    createLineNode('d-tri3', -10, 10, 10, 0),
    // Bar (cathode)
    createLineNode('d-bar', 10, -10, 10, 10),
    createLineNode('d-lead2', 10, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('D'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * LED symbol
 */
const LED: BlockDefinition = {
  id: 'elec-led',
  name: 'LED',
  description: 'Light Emitting Diode symbol',
  category: 'electrical-passive',
  tags: ['led', 'D', 'light', 'emitting', 'diode', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('d-lead1', -30, 0, -10, 0),
    // Triangle
    createLineNode('d-tri1', -10, -10, -10, 10),
    createLineNode('d-tri2', -10, -10, 10, 0),
    createLineNode('d-tri3', -10, 10, 10, 0),
    // Bar
    createLineNode('d-bar', 10, -10, 10, 10),
    createLineNode('d-lead2', 10, 0, 30, 0),
    // Light arrows
    createLineNode('d-arrow1', 5, -15, 12, -22),
    createLineNode('d-arrow1-head1', 12, -22, 8, -20),
    createLineNode('d-arrow1-head2', 12, -22, 10, -18),
    createLineNode('d-arrow2', 0, -18, 7, -25),
    createLineNode('d-arrow2-head1', 7, -25, 3, -23),
    createLineNode('d-arrow2-head2', 7, -25, 5, -21),
  ],
  attributes: [
    createRefDesAttribute('D'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Zener diode symbol
 */
const ZENER: BlockDefinition = {
  id: 'elec-zener',
  name: 'Zener Diode',
  description: 'Zener diode symbol',
  category: 'electrical-passive',
  tags: ['zener', 'D', 'diode', 'voltage', 'regulator', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('d-lead1', -30, 0, -10, 0),
    // Triangle
    createLineNode('d-tri1', -10, -10, -10, 10),
    createLineNode('d-tri2', -10, -10, 10, 0),
    createLineNode('d-tri3', -10, 10, 10, 0),
    // Z-shaped bar
    createLineNode('d-bar', 10, -10, 10, 10),
    createLineNode('d-z1', 10, -10, 6, -10),
    createLineNode('d-z2', 10, 10, 14, 10),
    createLineNode('d-lead2', 10, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('D'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Active Components
// =============================================================================

/**
 * NPN Transistor symbol
 */
const NPN_TRANSISTOR: BlockDefinition = {
  id: 'elec-npn',
  name: 'NPN Transistor',
  description: 'NPN bipolar junction transistor',
  category: 'electrical-active',
  tags: ['npn', 'transistor', 'Q', 'bjt', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Base lead
    createLineNode('q-base', -30, 0, -10, 0),
    // Vertical bar (base)
    createLineNode('q-bar', -10, -15, -10, 15),
    // Emitter (with arrow pointing out)
    createLineNode('q-emit', -10, 8, 15, 25),
    // Arrow on emitter
    createLineNode('q-emit-arr1', 15, 25, 8, 22),
    createLineNode('q-emit-arr2', 15, 25, 12, 18),
    // Collector
    createLineNode('q-coll', -10, -8, 15, -25),
    // Circle
    createEllipseNode('q-circle', 0, 0, 22, 22),
    // Emitter lead
    createLineNode('q-emit-lead', 15, 25, 15, 35),
    // Collector lead
    createLineNode('q-coll-lead', 15, -25, 15, -35),
  ],
  attributes: [
    createRefDesAttribute('Q'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * PNP Transistor symbol
 */
const PNP_TRANSISTOR: BlockDefinition = {
  id: 'elec-pnp',
  name: 'PNP Transistor',
  description: 'PNP bipolar junction transistor',
  category: 'electrical-active',
  tags: ['pnp', 'transistor', 'Q', 'bjt', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Base lead
    createLineNode('q-base', -30, 0, -10, 0),
    // Vertical bar (base)
    createLineNode('q-bar', -10, -15, -10, 15),
    // Emitter (with arrow pointing in)
    createLineNode('q-emit', -10, 8, 15, 25),
    // Arrow on emitter (pointing toward bar)
    createLineNode('q-emit-arr1', -6, 11, -10, 15),
    createLineNode('q-emit-arr2', -6, 11, -3, 8),
    // Collector
    createLineNode('q-coll', -10, -8, 15, -25),
    // Circle
    createEllipseNode('q-circle', 0, 0, 22, 22),
    // Emitter lead
    createLineNode('q-emit-lead', 15, 25, 15, 35),
    // Collector lead
    createLineNode('q-coll-lead', 15, -25, 15, -35),
  ],
  attributes: [
    createRefDesAttribute('Q'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Op-Amp symbol
 */
const OPAMP: BlockDefinition = {
  id: 'elec-opamp',
  name: 'Op-Amp',
  description: 'Operational amplifier symbol',
  category: 'electrical-active',
  tags: ['opamp', 'op-amp', 'amplifier', 'U', 'ic'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Triangle body
    createLineNode('op-left', -25, -30, -25, 30),
    createLineNode('op-top', -25, -30, 25, 0),
    createLineNode('op-bottom', -25, 30, 25, 0),
    // Inverting input (-)
    createLineNode('op-inv-lead', -45, -15, -25, -15),
    createLineNode('op-inv-minus', -32, -15, -28, -15),
    // Non-inverting input (+)
    createLineNode('op-noninv-lead', -45, 15, -25, 15),
    createLineNode('op-plus-h', -32, 15, -28, 15),
    createLineNode('op-plus-v', -30, 12, -30, 18),
    // Output
    createLineNode('op-out', 25, 0, 45, 0),
  ],
  attributes: [
    createRefDesAttribute('U'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Power & Ground Symbols
// =============================================================================

/**
 * Ground symbol (signal ground)
 */
const GROUND: BlockDefinition = {
  id: 'elec-ground',
  name: 'Ground',
  description: 'Signal ground symbol',
  category: 'electrical-power',
  tags: ['ground', 'gnd', '0V', 'reference'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('g-stem', 0, -15, 0, 0),
    createLineNode('g-line1', -12, 0, 12, 0),
    createLineNode('g-line2', -8, 5, 8, 5),
    createLineNode('g-line3', -4, 10, 4, 10),
  ],
  attributes: [],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Earth ground symbol
 */
const EARTH_GROUND: BlockDefinition = {
  id: 'elec-earth-ground',
  name: 'Earth Ground',
  description: 'Earth/chassis ground symbol',
  category: 'electrical-power',
  tags: ['earth', 'ground', 'chassis', 'gnd'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('g-stem', 0, -15, 0, 0),
    createLineNode('g-line1', -12, 0, 12, 0),
    createLineNode('g-diag1', -12, 0, -18, 8),
    createLineNode('g-diag2', -4, 0, -10, 8),
    createLineNode('g-diag3', 4, 0, -2, 8),
    createLineNode('g-diag4', 12, 0, 6, 8),
  ],
  attributes: [],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * VCC/VDD power symbol
 */
const VCC: BlockDefinition = {
  id: 'elec-vcc',
  name: 'VCC',
  description: 'Positive supply voltage symbol',
  category: 'electrical-power',
  tags: ['vcc', 'vdd', 'power', 'supply', '+V'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('v-stem', 0, 0, 0, 15),
    createLineNode('v-bar', -8, 0, 8, 0),
    createTextNode('v-label', -8, -15, 'VCC'),
  ],
  attributes: [
    {
      tag: 'VOLTAGE',
      prompt: 'Enter voltage:',
      defaultValue: '+5V',
      type: 'text',
      position: { x: 12, y: -10 },
      textStyle: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 10,
        fontWeight: 400,
        fontStyle: 'normal',
        color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
        alignment: 'left',
        rotation: 0,
      },
      required: false,
      visible: true,
      constant: false,
      verify: false,
    },
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Battery symbol
 */
const BATTERY: BlockDefinition = {
  id: 'elec-battery',
  name: 'Battery',
  description: 'Battery/cell symbol',
  category: 'electrical-power',
  tags: ['battery', 'cell', 'power', 'B'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('b-lead1', -25, 0, -8, 0),
    createLineNode('b-long', -8, -12, -8, 12),  // Positive plate (longer)
    createLineNode('b-short', 0, -6, 0, 6),     // Negative plate (shorter)
    createLineNode('b-lead2', 0, 0, 25, 0),
    // Plus sign
    createLineNode('b-plus-h', -15, -15, -11, -15),
    createLineNode('b-plus-v', -13, -17, -13, -13),
  ],
  attributes: [
    createRefDesAttribute('B'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// MOSFETs
// =============================================================================

/**
 * N-Channel MOSFET (Enhancement mode)
 */
const NMOS: BlockDefinition = {
  id: 'elec-nmos',
  name: 'N-Channel MOSFET',
  description: 'N-Channel enhancement mode MOSFET',
  category: 'electrical-active',
  tags: ['mosfet', 'nmos', 'transistor', 'Q', 'fet', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Gate lead
    createLineNode('m-gate-lead', -30, 0, -15, 0),
    // Gate vertical
    createLineNode('m-gate', -15, -15, -15, 15),
    // Channel (with gap)
    createLineNode('m-chan-gap', -10, -15, -10, 15),
    // Body vertical
    createLineNode('m-body', 0, -20, 0, 20),
    // Drain connection
    createLineNode('m-drain-h', 0, -15, -10, -15),
    createLineNode('m-drain-lead', 0, -15, 0, -35),
    // Source connection with arrow (pointing in for N-channel)
    createLineNode('m-source-h', 0, 15, -10, 15),
    createLineNode('m-source-lead', 0, 15, 0, 35),
    // Arrow on source (pointing right/in)
    createLineNode('m-arrow1', -6, 15, 0, 15),
    createLineNode('m-arrow2', -4, 12, 0, 15),
    createLineNode('m-arrow3', -4, 18, 0, 15),
    // Body connection (substrate)
    createLineNode('m-body-conn', 0, 0, -10, 0),
    // Circle
    createEllipseNode('m-circle', -5, 0, 25, 25),
  ],
  attributes: [
    createRefDesAttribute('Q'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * P-Channel MOSFET (Enhancement mode)
 */
const PMOS: BlockDefinition = {
  id: 'elec-pmos',
  name: 'P-Channel MOSFET',
  description: 'P-Channel enhancement mode MOSFET',
  category: 'electrical-active',
  tags: ['mosfet', 'pmos', 'transistor', 'Q', 'fet', 'semiconductor'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Gate lead
    createLineNode('m-gate-lead', -30, 0, -15, 0),
    // Gate vertical
    createLineNode('m-gate', -15, -15, -15, 15),
    // Channel (with gap)
    createLineNode('m-chan-gap', -10, -15, -10, 15),
    // Body vertical
    createLineNode('m-body', 0, -20, 0, 20),
    // Drain connection
    createLineNode('m-drain-h', 0, -15, -10, -15),
    createLineNode('m-drain-lead', 0, -15, 0, -35),
    // Source connection with arrow (pointing out for P-channel)
    createLineNode('m-source-h', 0, 15, -10, 15),
    createLineNode('m-source-lead', 0, 15, 0, 35),
    // Arrow on source (pointing left/out)
    createLineNode('m-arrow1', -10, 15, -4, 15),
    createLineNode('m-arrow2', -6, 12, -10, 15),
    createLineNode('m-arrow3', -6, 18, -10, 15),
    // Body connection (substrate)
    createLineNode('m-body-conn', 0, 0, -10, 0),
    // Circle
    createEllipseNode('m-circle', -5, 0, 25, 25),
  ],
  attributes: [
    createRefDesAttribute('Q'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Integrated Circuits
// =============================================================================

/**
 * Generic IC (DIP-8 style)
 */
const IC_DIP8: BlockDefinition = {
  id: 'elec-ic-dip8',
  name: 'IC DIP-8',
  description: 'Generic 8-pin DIP integrated circuit',
  category: 'electrical-active',
  tags: ['ic', 'dip', 'chip', 'U', 'integrated', 'circuit'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Body rectangle
    createRectNode('ic-body', -30, -40, 60, 80),
    // Pin 1 notch
    createEllipseNode('ic-notch', -30, 0, 5, 5),
    // Left pins (1-4)
    createLineNode('ic-pin1', -50, -30, -30, -30),
    createLineNode('ic-pin2', -50, -10, -30, -10),
    createLineNode('ic-pin3', -50, 10, -30, 10),
    createLineNode('ic-pin4', -50, 30, -30, 30),
    // Right pins (5-8)
    createLineNode('ic-pin5', 30, 30, 50, 30),
    createLineNode('ic-pin6', 30, 10, 50, 10),
    createLineNode('ic-pin7', 30, -10, 50, -10),
    createLineNode('ic-pin8', 30, -30, 50, -30),
  ],
  attributes: [
    createRefDesAttribute('U'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Generic IC (DIP-14 style)
 */
const IC_DIP14: BlockDefinition = {
  id: 'elec-ic-dip14',
  name: 'IC DIP-14',
  description: 'Generic 14-pin DIP integrated circuit',
  category: 'electrical-active',
  tags: ['ic', 'dip', 'chip', 'U', 'integrated', 'circuit'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Body rectangle
    createRectNode('ic-body', -30, -70, 60, 140),
    // Pin 1 notch
    createEllipseNode('ic-notch', -30, 0, 5, 5),
    // Left pins (1-7)
    createLineNode('ic-pin1', -50, -60, -30, -60),
    createLineNode('ic-pin2', -50, -40, -30, -40),
    createLineNode('ic-pin3', -50, -20, -30, -20),
    createLineNode('ic-pin4', -50, 0, -30, 0),
    createLineNode('ic-pin5', -50, 20, -30, 20),
    createLineNode('ic-pin6', -50, 40, -30, 40),
    createLineNode('ic-pin7', -50, 60, -30, 60),
    // Right pins (8-14)
    createLineNode('ic-pin8', 30, 60, 50, 60),
    createLineNode('ic-pin9', 30, 40, 50, 40),
    createLineNode('ic-pin10', 30, 20, 50, 20),
    createLineNode('ic-pin11', 30, 0, 50, 0),
    createLineNode('ic-pin12', 30, -20, 50, -20),
    createLineNode('ic-pin13', 30, -40, 50, -40),
    createLineNode('ic-pin14', 30, -60, 50, -60),
  ],
  attributes: [
    createRefDesAttribute('U'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Transformers
// =============================================================================

/**
 * Transformer symbol
 */
const TRANSFORMER: BlockDefinition = {
  id: 'elec-transformer',
  name: 'Transformer',
  description: 'Standard transformer symbol',
  category: 'electrical-passive',
  tags: ['transformer', 'T', 'inductor', 'coil', 'isolation'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Primary coil (left side)
    createLineNode('t-pri-lead1', -40, -30, -25, -30),
    createEllipseNode('t-pri-loop1', -25, -22, 5, 5),
    createEllipseNode('t-pri-loop2', -25, -12, 5, 5),
    createEllipseNode('t-pri-loop3', -25, -2, 5, 5),
    createEllipseNode('t-pri-loop4', -25, 8, 5, 5),
    createEllipseNode('t-pri-loop5', -25, 18, 5, 5),
    createLineNode('t-pri-lead2', -40, 30, -25, 30),
    // Core lines
    createLineNode('t-core1', -12, -30, -12, 30),
    createLineNode('t-core2', -8, -30, -8, 30),
    // Secondary coil (right side)
    createLineNode('t-sec-lead1', 40, -30, 25, -30),
    createEllipseNode('t-sec-loop1', 25, -22, 5, 5),
    createEllipseNode('t-sec-loop2', 25, -12, 5, 5),
    createEllipseNode('t-sec-loop3', 25, -2, 5, 5),
    createEllipseNode('t-sec-loop4', 25, 8, 5, 5),
    createEllipseNode('t-sec-loop5', 25, 18, 5, 5),
    createLineNode('t-sec-lead2', 40, 30, 25, 30),
  ],
  attributes: [
    createRefDesAttribute('T'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Center-tapped transformer
 */
const TRANSFORMER_CT: BlockDefinition = {
  id: 'elec-transformer-ct',
  name: 'Transformer (Center Tap)',
  description: 'Center-tapped transformer symbol',
  category: 'electrical-passive',
  tags: ['transformer', 'T', 'center', 'tap', 'inductor', 'coil'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    // Primary coil (left side)
    createLineNode('t-pri-lead1', -40, -30, -25, -30),
    createEllipseNode('t-pri-loop1', -25, -22, 5, 5),
    createEllipseNode('t-pri-loop2', -25, -12, 5, 5),
    createEllipseNode('t-pri-loop3', -25, -2, 5, 5),
    createEllipseNode('t-pri-loop4', -25, 8, 5, 5),
    createEllipseNode('t-pri-loop5', -25, 18, 5, 5),
    createLineNode('t-pri-lead2', -40, 30, -25, 30),
    // Core lines
    createLineNode('t-core1', -12, -30, -12, 30),
    createLineNode('t-core2', -8, -30, -8, 30),
    // Secondary coil (right side)
    createLineNode('t-sec-lead1', 40, -30, 25, -30),
    createEllipseNode('t-sec-loop1', 25, -22, 5, 5),
    createEllipseNode('t-sec-loop2', 25, -12, 5, 5),
    createEllipseNode('t-sec-loop3', 25, -2, 5, 5),
    createEllipseNode('t-sec-loop4', 25, 8, 5, 5),
    createEllipseNode('t-sec-loop5', 25, 18, 5, 5),
    createLineNode('t-sec-lead2', 40, 30, 25, 30),
    // Center tap
    createLineNode('t-ct-lead', 40, 0, 25, 0),
  ],
  attributes: [
    createRefDesAttribute('T'),
    createValueAttribute(),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Switches
// =============================================================================

/**
 * SPST Switch (Single Pole Single Throw)
 */
const SWITCH_SPST: BlockDefinition = {
  id: 'elec-switch-spst',
  name: 'Switch SPST',
  description: 'Single pole single throw switch',
  category: 'electrical-switches',
  tags: ['switch', 'spst', 'S', 'contact'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('sw-lead1', -30, 0, -10, 0),
    createEllipseNode('sw-contact1', -10, 0, 3, 3),
    createLineNode('sw-arm', -10, 0, 10, -15),
    createEllipseNode('sw-contact2', 10, 0, 3, 3),
    createLineNode('sw-lead2', 10, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('S'),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

/**
 * Push Button (Normally Open)
 */
const PUSHBUTTON_NO: BlockDefinition = {
  id: 'elec-pushbutton-no',
  name: 'Push Button (NO)',
  description: 'Normally open momentary push button',
  category: 'electrical-switches',
  tags: ['switch', 'button', 'pushbutton', 'momentary', 'S'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createLineNode('pb-lead1', -30, 0, -10, 0),
    createEllipseNode('pb-contact1', -10, 0, 3, 3),
    createLineNode('pb-arm1', -10, 0, -10, -10),
    createLineNode('pb-arm2', 10, 0, 10, -10),
    createLineNode('pb-bar', -10, -10, 10, -10),
    createLineNode('pb-actuator', 0, -10, 0, -18),
    createLineNode('pb-button', -5, -18, 5, -18),
    createEllipseNode('pb-contact2', 10, 0, 3, 3),
    createLineNode('pb-lead2', 10, 0, 30, 0),
  ],
  attributes: [
    createRefDesAttribute('S'),
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Connectors
// =============================================================================

/**
 * Generic connector pin
 */
const CONNECTOR_PIN: BlockDefinition = {
  id: 'elec-connector-pin',
  name: 'Connector Pin',
  description: 'Single connector pin',
  category: 'electrical-connectors',
  tags: ['connector', 'pin', 'J', 'terminal'],
  version: '1.0.0',
  createdAt: now,
  updatedAt: now,
  basePoint: { x: 0, y: 0 },
  geometry: [
    createEllipseNode('pin-circle', 0, 0, 5, 5),
    createLineNode('pin-lead', 5, 0, 20, 0),
  ],
  attributes: [
    createRefDesAttribute('J'),
    {
      tag: 'PIN',
      prompt: 'Enter pin number:',
      defaultValue: '1',
      type: 'text',
      position: { x: -12, y: -5 },
      textStyle: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 8,
        fontWeight: 400,
        fontStyle: 'normal',
        color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
        alignment: 'center',
        rotation: 0,
      },
      required: false,
      visible: true,
      constant: false,
      verify: false,
    },
  ],
  units: 'pixels',
  annotative: false,
  allowExplode: true,
};

// =============================================================================
// Library Export
// =============================================================================

/**
 * All electrical symbol blocks
 */
export const ELECTRICAL_SYMBOLS: BlockDefinition[] = [
  // Passive
  RESISTOR,
  RESISTOR_EU,
  CAPACITOR,
  CAPACITOR_POLARIZED,
  INDUCTOR,
  // Diodes
  DIODE,
  LED,
  ZENER,
  // BJT Transistors
  NPN_TRANSISTOR,
  PNP_TRANSISTOR,
  // MOSFETs
  NMOS,
  PMOS,
  // ICs
  IC_DIP8,
  IC_DIP14,
  OPAMP,
  // Transformers
  TRANSFORMER,
  TRANSFORMER_CT,
  // Switches
  SWITCH_SPST,
  PUSHBUTTON_NO,
  // Power
  GROUND,
  EARTH_GROUND,
  VCC,
  BATTERY,
  // Connectors
  CONNECTOR_PIN,
];

/**
 * Electrical symbols library
 */
export const ELECTRICAL_SYMBOLS_LIBRARY: BlockLibrary = {
  id: 'lib-electrical',
  name: 'Electrical Symbols',
  description: 'Common electrical and electronic schematic symbols (IEEE/ANSI)',
  version: '1.0.0',
  blocks: ELECTRICAL_SYMBOLS,
  builtIn: true,
};

/**
 * Get the electrical symbols library
 */
export function getElectricalSymbolsLibrary(): BlockLibrary {
  return ELECTRICAL_SYMBOLS_LIBRARY;
}
