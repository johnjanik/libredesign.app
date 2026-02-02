/**
 * Common PCB Footprints Library
 *
 * Standard through-hole and SMD component footprints.
 * Dimensions follow IPC-7351 land pattern standards.
 */

import type { PCBFootprint, PCBPad, FootprintGraphic, FootprintText } from '@core/types/pcb';
import { createPCBPad } from '@core/types/pcb';
import type { Point } from '@core/types/geometry';

// =============================================================================
// Footprint Library Type
// =============================================================================

export interface PCBFootprintLibrary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly footprints: PCBFootprint[];
}

// =============================================================================
// Helper to create silkscreen line
// =============================================================================

function silkLine(start: Point, end: Point, layer = 'F.SilkS'): FootprintGraphic {
  return {
    type: 'line',
    layer,
    width: 0.12,
    fill: 'none',
    points: [start, end],
  };
}

function silkRect(x1: number, y1: number, x2: number, y2: number, layer = 'F.SilkS'): FootprintGraphic {
  return {
    type: 'rect',
    layer,
    width: 0.12,
    fill: 'outline',
    points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
  };
}

function silkCircle(cx: number, cy: number, radius: number, layer = 'F.SilkS'): FootprintGraphic {
  return {
    type: 'circle',
    layer,
    width: 0.12,
    fill: 'none',
    center: { x: cx, y: cy },
    radius,
  };
}

function silkArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, layer = 'F.SilkS'): FootprintGraphic {
  return {
    type: 'arc',
    layer,
    width: 0.12,
    fill: 'none',
    center: { x: cx, y: cy },
    radius,
    startAngle,
    endAngle,
  };
}

// =============================================================================
// Helper to create courtyard
// =============================================================================

function courtyard(x1: number, y1: number, x2: number, y2: number): Point[] {
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
}

// =============================================================================
// Default text fields
// =============================================================================

function defaultTextFields(refY: number = -2, valY: number = 2): FootprintText[] {
  return [
    {
      type: 'reference',
      text: 'REF**',
      position: { x: 0, y: refY },
      rotation: 0,
      layer: 'F.SilkS',
      fontSize: 1,
      visible: true,
    },
    {
      type: 'value',
      text: 'VAL**',
      position: { x: 0, y: valY },
      rotation: 0,
      layer: 'F.Fab',
      fontSize: 1,
      visible: false,
    },
  ];
}

// =============================================================================
// Through-Hole Footprints
// =============================================================================

/**
 * Resistor through-hole footprint (axial)
 */
export function createResistorTH(pitch: number = 10.16): PCBFootprint {
  const halfPitch = pitch / 2;
  return {
    id: `fp-resistor-th-${pitch}`,
    name: `Resistor_THT_${pitch}mm`,
    description: `Axial resistor, ${pitch}mm pitch`,
    category: 'thru-hole-passive',
    keywords: ['resistor', 'through-hole', 'axial', 'THT'],
    refDesPrefix: 'R',
    pads: [
      createPCBPad('1', 'thru_hole', { x: -halfPitch, y: 0 }, { width: 1.6, height: 1.6 }, {
        shape: 'circle',
        drill: { width: 0.8, height: 0.8, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
      createPCBPad('2', 'thru_hole', { x: halfPitch, y: 0 }, { width: 1.6, height: 1.6 }, {
        shape: 'circle',
        drill: { width: 0.8, height: 0.8, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
    ],
    silkscreen: [
      silkRect(-3, -1.25, 3, 1.25),
      silkLine({ x: -halfPitch, y: 0 }, { x: -3, y: 0 }),
      silkLine({ x: 3, y: 0 }, { x: halfPitch, y: 0 }),
    ],
    courtyard: courtyard(-halfPitch - 1, -1.75, halfPitch + 1, 1.75),
    fabrication: [silkRect(-3, -1.25, 3, 1.25, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(),
  };
}

/**
 * Capacitor through-hole footprint (radial)
 */
export function createCapacitorTH(
  pitch: number = 5,
  diameter: number = 6.3
): PCBFootprint {
  const halfPitch = pitch / 2;
  const radius = diameter / 2;
  return {
    id: `fp-cap-th-${pitch}-${diameter}`,
    name: `Capacitor_THT_D${diameter}mm_P${pitch}mm`,
    description: `Radial capacitor, ${diameter}mm diameter, ${pitch}mm pitch`,
    category: 'thru-hole-passive',
    keywords: ['capacitor', 'through-hole', 'radial', 'THT', 'electrolytic'],
    refDesPrefix: 'C',
    pads: [
      createPCBPad('1', 'thru_hole', { x: -halfPitch, y: 0 }, { width: 1.8, height: 1.8 }, {
        shape: 'rect',
        drill: { width: 0.9, height: 0.9, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
      createPCBPad('2', 'thru_hole', { x: halfPitch, y: 0 }, { width: 1.8, height: 1.8 }, {
        shape: 'circle',
        drill: { width: 0.9, height: 0.9, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
    ],
    silkscreen: [
      silkCircle(0, 0, radius),
      silkLine({ x: -halfPitch - 0.5, y: -0.5 }, { x: -halfPitch - 0.5, y: 0.5 }),
    ],
    courtyard: courtyard(-radius - 0.5, -radius - 0.5, radius + 0.5, radius + 0.5),
    fabrication: [silkCircle(0, 0, radius, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-radius - 1, radius + 1),
  };
}

/**
 * DIP IC footprint
 */
export function createDIP(pins: number, pitch: number = 2.54): PCBFootprint {
  const rows = pins / 2;
  const rowSpacing = 7.62; // 300 mil standard
  const halfRow = rowSpacing / 2;
  const pads: PCBPad[] = [];

  for (let i = 0; i < rows; i++) {
    const yPos = i * pitch - ((rows - 1) * pitch) / 2;
    // Left side (pins 1 to N/2)
    pads.push(
      createPCBPad(String(i + 1), 'thru_hole', { x: -halfRow, y: yPos }, { width: 1.6, height: 1.6 }, {
        shape: i === 0 ? 'rect' : 'circle',
        drill: { width: 0.8, height: 0.8, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      })
    );
    // Right side (pins N/2+1 to N)
    pads.push(
      createPCBPad(String(pins - i), 'thru_hole', { x: halfRow, y: yPos }, { width: 1.6, height: 1.6 }, {
        shape: 'circle',
        drill: { width: 0.8, height: 0.8, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      })
    );
  }

  const bodyLength = (rows - 1) * pitch + 2;
  const bodyWidth = 6.35; // 250 mil

  return {
    id: `fp-dip-${pins}`,
    name: `DIP-${pins}`,
    description: `DIP-${pins}, ${pitch}mm pitch`,
    category: 'thru-hole-ic',
    keywords: ['DIP', 'through-hole', 'IC', 'THT'],
    refDesPrefix: 'U',
    pads,
    silkscreen: [
      silkRect(-bodyWidth / 2, -bodyLength / 2, bodyWidth / 2, bodyLength / 2),
      silkArc(0, -bodyLength / 2, 1, 0, 180),
    ],
    courtyard: courtyard(-halfRow - 1.5, -bodyLength / 2 - 0.5, halfRow + 1.5, bodyLength / 2 + 0.5),
    fabrication: [silkRect(-bodyWidth / 2, -bodyLength / 2, bodyWidth / 2, bodyLength / 2, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-bodyLength / 2 - 1.5, bodyLength / 2 + 1.5),
  };
}

/**
 * TO-220 transistor/regulator footprint
 */
export function createTO220(): PCBFootprint {
  return {
    id: 'fp-to220',
    name: 'TO-220',
    description: 'TO-220 package, 2.54mm pitch',
    category: 'thru-hole-discrete',
    keywords: ['TO-220', 'through-hole', 'transistor', 'regulator', 'THT'],
    refDesPrefix: 'Q',
    pads: [
      createPCBPad('1', 'thru_hole', { x: -2.54, y: 0 }, { width: 1.8, height: 1.8 }, {
        shape: 'circle',
        drill: { width: 1.0, height: 1.0, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
      createPCBPad('2', 'thru_hole', { x: 0, y: 0 }, { width: 1.8, height: 1.8 }, {
        shape: 'circle',
        drill: { width: 1.0, height: 1.0, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
      createPCBPad('3', 'thru_hole', { x: 2.54, y: 0 }, { width: 1.8, height: 1.8 }, {
        shape: 'circle',
        drill: { width: 1.0, height: 1.0, shape: 'circle' },
        layers: ['*.Cu', '*.Mask'],
      }),
    ],
    silkscreen: [silkRect(-5, -2.5, 5, 5)],
    courtyard: courtyard(-6, -3, 6, 6),
    fabrication: [silkRect(-5, -2.5, 5, 5, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-4, 6.5),
  };
}

// =============================================================================
// SMD Footprints
// =============================================================================

/**
 * SMD chip resistor/capacitor footprint
 */
export function createSMDChip(
  code: '0402' | '0603' | '0805' | '1206' | '1210' | '2512'
): PCBFootprint {
  const dimensions: Record<
    string,
    { padSize: { width: number; height: number }; padSpacing: number; bodySize: { width: number; height: number } }
  > = {
    '0402': {
      padSize: { width: 0.5, height: 0.5 },
      padSpacing: 0.85,
      bodySize: { width: 1.0, height: 0.5 },
    },
    '0603': {
      padSize: { width: 0.8, height: 0.8 },
      padSpacing: 1.4,
      bodySize: { width: 1.6, height: 0.8 },
    },
    '0805': {
      padSize: { width: 1.0, height: 1.25 },
      padSpacing: 1.8,
      bodySize: { width: 2.0, height: 1.25 },
    },
    '1206': {
      padSize: { width: 1.15, height: 1.8 },
      padSpacing: 2.9,
      bodySize: { width: 3.2, height: 1.6 },
    },
    '1210': {
      padSize: { width: 1.3, height: 2.7 },
      padSpacing: 2.9,
      bodySize: { width: 3.2, height: 2.5 },
    },
    '2512': {
      padSize: { width: 1.4, height: 3.4 },
      padSpacing: 5.9,
      bodySize: { width: 6.35, height: 3.2 },
    },
  };

  const dim = dimensions[code]!;
  const halfSpacing = dim.padSpacing / 2;

  return {
    id: `fp-smd-${code}`,
    name: code,
    description: `SMD chip component ${code}`,
    category: 'smd-chip',
    keywords: ['SMD', 'chip', 'resistor', 'capacitor', code],
    refDesPrefix: 'R',
    pads: [
      createPCBPad('1', 'smd', { x: -halfSpacing, y: 0 }, dim.padSize, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('2', 'smd', { x: halfSpacing, y: 0 }, dim.padSize, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
    ],
    silkscreen: [],
    courtyard: courtyard(
      -dim.bodySize.width / 2 - 0.25,
      -dim.bodySize.height / 2 - 0.25,
      dim.bodySize.width / 2 + 0.25,
      dim.bodySize.height / 2 + 0.25
    ),
    fabrication: [silkRect(
      -dim.bodySize.width / 2,
      -dim.bodySize.height / 2,
      dim.bodySize.width / 2,
      dim.bodySize.height / 2,
      'F.Fab'
    )],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-dim.bodySize.height / 2 - 0.8, dim.bodySize.height / 2 + 0.8),
  };
}

/**
 * SOT-23 transistor footprint
 */
export function createSOT23(variant: 3 | 5 | 6 = 3): PCBFootprint {
  const pads: PCBPad[] = [];
  const padWidth = 0.6;
  const padHeight = 0.7;

  if (variant === 3) {
    pads.push(
      createPCBPad('1', 'smd', { x: -0.95, y: 1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('2', 'smd', { x: 0.95, y: 1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('3', 'smd', { x: 0, y: -1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      })
    );
  } else if (variant === 5) {
    pads.push(
      createPCBPad('1', 'smd', { x: -0.95, y: 1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('2', 'smd', { x: 0, y: 1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('3', 'smd', { x: 0.95, y: 1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('4', 'smd', { x: 0.95, y: -1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      }),
      createPCBPad('5', 'smd', { x: -0.95, y: -1.0 }, { width: padWidth, height: padHeight }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      })
    );
  } else {
    for (let i = 0; i < 3; i++) {
      pads.push(
        createPCBPad(String(i + 1), 'smd', { x: (i - 1) * 0.95, y: 1.0 }, { width: padWidth, height: padHeight }, {
          shape: 'rect',
          layers: ['F.Cu', 'F.Paste', 'F.Mask'],
        })
      );
      pads.push(
        createPCBPad(String(6 - i), 'smd', { x: (i - 1) * 0.95, y: -1.0 }, { width: padWidth, height: padHeight }, {
          shape: 'rect',
          layers: ['F.Cu', 'F.Paste', 'F.Mask'],
        })
      );
    }
  }

  return {
    id: `fp-sot23-${variant}`,
    name: `SOT-23-${variant}`,
    description: `SOT-23-${variant} package`,
    category: 'smd-discrete',
    keywords: ['SOT-23', 'SMD', 'transistor', 'IC'],
    refDesPrefix: 'Q',
    pads,
    silkscreen: [silkRect(-1.5, -0.7, 1.5, 0.7)],
    courtyard: courtyard(-1.75, -1.6, 1.75, 1.6),
    fabrication: [silkRect(-1.5, -0.7, 1.5, 0.7, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-2, 2),
  };
}

/**
 * SOIC (Small Outline IC) footprint
 */
export function createSOIC(pins: 8 | 14 | 16 | 20): PCBFootprint {
  const pitch = 1.27;
  const bodyWidth = 3.9;
  const padWidth = 0.6;
  const padHeight = 1.55;
  const xSpacing = 5.4;
  const rows = pins / 2;

  const pads: PCBPad[] = [];

  for (let i = 0; i < rows; i++) {
    const yPos = (i - (rows - 1) / 2) * pitch;

    pads.push(
      createPCBPad(String(i + 1), 'smd', { x: -xSpacing / 2, y: yPos }, { width: padHeight, height: padWidth }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      })
    );

    pads.push(
      createPCBPad(String(pins - i), 'smd', { x: xSpacing / 2, y: yPos }, { width: padHeight, height: padWidth }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      })
    );
  }

  const bodyLength = (rows - 1) * pitch + 2;

  return {
    id: `fp-soic-${pins}`,
    name: `SOIC-${pins}`,
    description: `SOIC-${pins}, 1.27mm pitch`,
    category: 'smd-ic',
    keywords: ['SOIC', 'SMD', 'IC'],
    refDesPrefix: 'U',
    pads,
    silkscreen: [
      silkRect(-bodyWidth / 2, -bodyLength / 2, bodyWidth / 2, bodyLength / 2),
      silkCircle(-bodyWidth / 2 + 0.8, -bodyLength / 2 + 0.8, 0.3),
    ],
    courtyard: courtyard(-xSpacing / 2 - padHeight / 2 - 0.25, -bodyLength / 2 - 0.25, xSpacing / 2 + padHeight / 2 + 0.25, bodyLength / 2 + 0.25),
    fabrication: [silkRect(-bodyWidth / 2, -bodyLength / 2, bodyWidth / 2, bodyLength / 2, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-bodyLength / 2 - 1.5, bodyLength / 2 + 1.5),
  };
}

/**
 * QFP (Quad Flat Package) footprint
 */
export function createQFP(
  pins: 32 | 44 | 64 | 100 | 144,
  pitch: 0.5 | 0.65 | 0.8 = 0.5
): PCBFootprint {
  const padsPerSide = pins / 4;
  const padWidth = pitch * 0.55;
  const padHeight = 1.5;

  const bodySizes: Record<number, number> = {
    32: 7,
    44: 10,
    64: 12,
    100: 14,
    144: 20,
  };

  const bodySize = bodySizes[pins] ?? 10;
  const padCenterOffset = bodySize / 2 + padHeight / 2 - 0.25;

  const pads: PCBPad[] = [];
  let pinNum = 1;

  const sides: Array<{
    xMult: number;
    yMult: number;
    vertical: boolean;
    offset: number;
  }> = [
    { xMult: 1, yMult: 0, vertical: false, offset: padCenterOffset },
    { xMult: 0, yMult: 1, vertical: true, offset: padCenterOffset },
    { xMult: -1, yMult: 0, vertical: false, offset: -padCenterOffset },
    { xMult: 0, yMult: -1, vertical: true, offset: -padCenterOffset },
  ];

  for (const side of sides) {
    for (let i = 0; i < padsPerSide; i++) {
      const pos = (i - (padsPerSide - 1) / 2) * pitch;
      const x = side.vertical ? side.offset : pos * side.xMult;
      const y = side.vertical ? pos * side.yMult : side.offset;

      const size = side.vertical
        ? { width: padHeight, height: padWidth }
        : { width: padWidth, height: padHeight };

      pads.push(
        createPCBPad(String(pinNum), 'smd', { x, y }, size, {
          shape: 'rect',
          layers: ['F.Cu', 'F.Paste', 'F.Mask'],
        })
      );
      pinNum++;
    }
  }

  return {
    id: `fp-qfp-${pins}-${pitch}`,
    name: `QFP-${pins}_${pitch}mm`,
    description: `QFP-${pins}, ${pitch}mm pitch`,
    category: 'smd-ic',
    keywords: ['QFP', 'SMD', 'IC', 'microcontroller'],
    refDesPrefix: 'U',
    pads,
    silkscreen: [
      silkRect(-bodySize / 2, -bodySize / 2, bodySize / 2, bodySize / 2),
      silkCircle(-bodySize / 2 + 1, bodySize / 2 - 1, 0.5),
    ],
    courtyard: courtyard(
      -padCenterOffset - padHeight / 2 - 0.25,
      -padCenterOffset - padHeight / 2 - 0.25,
      padCenterOffset + padHeight / 2 + 0.25,
      padCenterOffset + padHeight / 2 + 0.25
    ),
    fabrication: [silkRect(-bodySize / 2, -bodySize / 2, bodySize / 2, bodySize / 2, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-bodySize / 2 - 2, bodySize / 2 + 2),
  };
}

/**
 * USB Type-C connector footprint (16-pin SMD)
 */
export function createUSBTypeC(): PCBFootprint {
  const pads: PCBPad[] = [];

  const topPins = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12'];
  const bottomPins = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12'];

  const pitch = 0.5;
  const startX = -2.75;

  for (let i = 0; i < 12; i++) {
    pads.push(
      createPCBPad(topPins[i]!, 'smd', { x: startX + i * pitch, y: 2.75 }, { width: 0.3, height: 1.0 }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      })
    );
    pads.push(
      createPCBPad(bottomPins[i]!, 'smd', { x: startX + i * pitch, y: -2.75 }, { width: 0.3, height: 1.0 }, {
        shape: 'rect',
        layers: ['F.Cu', 'F.Paste', 'F.Mask'],
      })
    );
  }

  // Shield/mounting holes
  pads.push(
    createPCBPad('S1', 'thru_hole', { x: -4.32, y: 0 }, { width: 1.0, height: 1.6 }, {
      shape: 'oval',
      drill: { width: 0.65, height: 1.0, shape: 'oval' },
      layers: ['*.Cu', '*.Mask'],
    }),
    createPCBPad('S2', 'thru_hole', { x: 4.32, y: 0 }, { width: 1.0, height: 1.6 }, {
      shape: 'oval',
      drill: { width: 0.65, height: 1.0, shape: 'oval' },
      layers: ['*.Cu', '*.Mask'],
    })
  );

  return {
    id: 'fp-usb-type-c',
    name: 'USB_C_Receptacle',
    description: 'USB Type-C receptacle, 24-pin',
    category: 'connector',
    keywords: ['USB', 'Type-C', 'connector', 'USB-C'],
    refDesPrefix: 'J',
    pads,
    silkscreen: [silkRect(-4.5, -3.5, 4.5, 3.5)],
    courtyard: courtyard(-5.5, -4, 5.5, 4),
    fabrication: [silkRect(-4.5, -3.5, 4.5, 3.5, 'F.Fab')],
    origin: { x: 0, y: 0 },
    textFields: defaultTextFields(-5, 5),
  };
}

// =============================================================================
// Pre-built Library
// =============================================================================

/**
 * Standard footprint library
 */
export const COMMON_FOOTPRINTS: PCBFootprint[] = [
  // Through-hole
  createResistorTH(7.62),
  createResistorTH(10.16),
  createResistorTH(12.7),
  createCapacitorTH(2.5, 5),
  createCapacitorTH(5, 6.3),
  createCapacitorTH(5, 8),
  createCapacitorTH(5, 10),
  createDIP(8),
  createDIP(14),
  createDIP(16),
  createDIP(20),
  createDIP(28),
  createDIP(40),
  createTO220(),

  // SMD chip
  createSMDChip('0402'),
  createSMDChip('0603'),
  createSMDChip('0805'),
  createSMDChip('1206'),
  createSMDChip('1210'),
  createSMDChip('2512'),

  // SMD transistors/ICs
  createSOT23(3),
  createSOT23(5),
  createSOT23(6),
  createSOIC(8),
  createSOIC(14),
  createSOIC(16),
  createSOIC(20),
  createQFP(32),
  createQFP(44),
  createQFP(64),
  createQFP(100),

  // Connectors
  createUSBTypeC(),
];

/**
 * Common footprints library export
 */
export const COMMON_FOOTPRINTS_LIBRARY: PCBFootprintLibrary = {
  id: 'lib-pcb-common',
  name: 'Common Footprints',
  description: 'Standard through-hole and SMD footprints (IPC-7351)',
  version: '1.0.0',
  footprints: COMMON_FOOTPRINTS,
};
