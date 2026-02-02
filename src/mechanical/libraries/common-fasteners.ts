/**
 * Common Fasteners Library
 *
 * Standard fastener specifications following ISO/ANSI standards:
 * - Hex bolts (ISO 4014, ISO 4017)
 * - Socket head cap screws (ISO 4762)
 * - Machine screws
 * - Set screws
 * - Nuts and washers
 */

/**
 * Metric thread specifications (ISO 261)
 */
export interface MetricThreadSpec {
  readonly size: string;
  readonly majorDiameter: number; // mm
  readonly pitch: number; // mm (coarse thread)
  readonly minorDiameter: number; // mm
  readonly pitchDiameter: number; // mm
}

/**
 * Standard metric coarse thread pitches
 */
export const METRIC_COARSE_THREADS: MetricThreadSpec[] = [
  { size: 'M1.6', majorDiameter: 1.6, pitch: 0.35, minorDiameter: 1.171, pitchDiameter: 1.373 },
  { size: 'M2', majorDiameter: 2, pitch: 0.4, minorDiameter: 1.509, pitchDiameter: 1.740 },
  { size: 'M2.5', majorDiameter: 2.5, pitch: 0.45, minorDiameter: 1.948, pitchDiameter: 2.208 },
  { size: 'M3', majorDiameter: 3, pitch: 0.5, minorDiameter: 2.387, pitchDiameter: 2.675 },
  { size: 'M4', majorDiameter: 4, pitch: 0.7, minorDiameter: 3.141, pitchDiameter: 3.545 },
  { size: 'M5', majorDiameter: 5, pitch: 0.8, minorDiameter: 4.019, pitchDiameter: 4.480 },
  { size: 'M6', majorDiameter: 6, pitch: 1.0, minorDiameter: 4.773, pitchDiameter: 5.350 },
  { size: 'M8', majorDiameter: 8, pitch: 1.25, minorDiameter: 6.466, pitchDiameter: 7.188 },
  { size: 'M10', majorDiameter: 10, pitch: 1.5, minorDiameter: 8.160, pitchDiameter: 9.026 },
  { size: 'M12', majorDiameter: 12, pitch: 1.75, minorDiameter: 9.853, pitchDiameter: 10.863 },
  { size: 'M14', majorDiameter: 14, pitch: 2.0, minorDiameter: 11.546, pitchDiameter: 12.701 },
  { size: 'M16', majorDiameter: 16, pitch: 2.0, minorDiameter: 13.546, pitchDiameter: 14.701 },
  { size: 'M20', majorDiameter: 20, pitch: 2.5, minorDiameter: 16.933, pitchDiameter: 18.376 },
  { size: 'M24', majorDiameter: 24, pitch: 3.0, minorDiameter: 20.319, pitchDiameter: 22.051 },
  { size: 'M30', majorDiameter: 30, pitch: 3.5, minorDiameter: 25.706, pitchDiameter: 27.727 },
  { size: 'M36', majorDiameter: 36, pitch: 4.0, minorDiameter: 31.093, pitchDiameter: 33.402 },
];

/**
 * Standard metric fine thread pitches
 */
export const METRIC_FINE_THREADS: MetricThreadSpec[] = [
  { size: 'M6x0.75', majorDiameter: 6, pitch: 0.75, minorDiameter: 5.080, pitchDiameter: 5.513 },
  { size: 'M8x1', majorDiameter: 8, pitch: 1.0, minorDiameter: 6.773, pitchDiameter: 7.350 },
  { size: 'M10x1', majorDiameter: 10, pitch: 1.0, minorDiameter: 8.773, pitchDiameter: 9.350 },
  { size: 'M10x1.25', majorDiameter: 10, pitch: 1.25, minorDiameter: 8.466, pitchDiameter: 9.188 },
  { size: 'M12x1.25', majorDiameter: 12, pitch: 1.25, minorDiameter: 10.466, pitchDiameter: 11.188 },
  { size: 'M12x1.5', majorDiameter: 12, pitch: 1.5, minorDiameter: 10.160, pitchDiameter: 11.026 },
  { size: 'M14x1.5', majorDiameter: 14, pitch: 1.5, minorDiameter: 12.160, pitchDiameter: 13.026 },
  { size: 'M16x1.5', majorDiameter: 16, pitch: 1.5, minorDiameter: 14.160, pitchDiameter: 15.026 },
  { size: 'M20x1.5', majorDiameter: 20, pitch: 1.5, minorDiameter: 18.160, pitchDiameter: 19.026 },
  { size: 'M20x2', majorDiameter: 20, pitch: 2.0, minorDiameter: 17.546, pitchDiameter: 18.701 },
  { size: 'M24x2', majorDiameter: 24, pitch: 2.0, minorDiameter: 21.546, pitchDiameter: 22.701 },
];

/**
 * Hex bolt dimensions (ISO 4014, ISO 4017)
 */
export interface HexBoltSpec {
  readonly size: string;
  readonly threadSize: string;
  readonly headWidth: number; // across flats, mm
  readonly headHeight: number; // mm
  readonly standardLengths: number[]; // mm
}

/**
 * Standard hex bolt specifications (ISO 4014)
 */
export const HEX_BOLT_SPECS: HexBoltSpec[] = [
  { size: 'M3', threadSize: 'M3', headWidth: 5.5, headHeight: 2.0, standardLengths: [8, 10, 12, 16, 20, 25, 30] },
  { size: 'M4', threadSize: 'M4', headWidth: 7, headHeight: 2.8, standardLengths: [8, 10, 12, 16, 20, 25, 30, 35, 40] },
  {
    size: 'M5',
    threadSize: 'M5',
    headWidth: 8,
    headHeight: 3.5,
    standardLengths: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50],
  },
  {
    size: 'M6',
    threadSize: 'M6',
    headWidth: 10,
    headHeight: 4.0,
    standardLengths: [12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80],
  },
  {
    size: 'M8',
    threadSize: 'M8',
    headWidth: 13,
    headHeight: 5.3,
    standardLengths: [16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
  },
  {
    size: 'M10',
    threadSize: 'M10',
    headWidth: 17,
    headHeight: 6.4,
    standardLengths: [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120],
  },
  {
    size: 'M12',
    threadSize: 'M12',
    headWidth: 19,
    headHeight: 7.5,
    standardLengths: [25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140],
  },
  {
    size: 'M16',
    threadSize: 'M16',
    headWidth: 24,
    headHeight: 10,
    standardLengths: [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200],
  },
  {
    size: 'M20',
    threadSize: 'M20',
    headWidth: 30,
    headHeight: 12.5,
    standardLengths: [40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200],
  },
  {
    size: 'M24',
    threadSize: 'M24',
    headWidth: 36,
    headHeight: 15,
    standardLengths: [50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200],
  },
];

/**
 * Socket head cap screw dimensions (ISO 4762)
 */
export interface SocketHeadCapScrewSpec {
  readonly size: string;
  readonly threadSize: string;
  readonly headDiameter: number; // mm
  readonly headHeight: number; // mm
  readonly socketSize: number; // hex key size, mm
  readonly standardLengths: number[]; // mm
}

/**
 * Standard socket head cap screw specifications (ISO 4762)
 */
export const SOCKET_HEAD_CAP_SCREW_SPECS: SocketHeadCapScrewSpec[] = [
  {
    size: 'M3',
    threadSize: 'M3',
    headDiameter: 5.5,
    headHeight: 3,
    socketSize: 2.5,
    standardLengths: [6, 8, 10, 12, 16, 20, 25, 30],
  },
  {
    size: 'M4',
    threadSize: 'M4',
    headDiameter: 7,
    headHeight: 4,
    socketSize: 3,
    standardLengths: [8, 10, 12, 16, 20, 25, 30, 35, 40],
  },
  {
    size: 'M5',
    threadSize: 'M5',
    headDiameter: 8.5,
    headHeight: 5,
    socketSize: 4,
    standardLengths: [8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50],
  },
  {
    size: 'M6',
    threadSize: 'M6',
    headDiameter: 10,
    headHeight: 6,
    socketSize: 5,
    standardLengths: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80],
  },
  {
    size: 'M8',
    threadSize: 'M8',
    headDiameter: 13,
    headHeight: 8,
    socketSize: 6,
    standardLengths: [12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
  },
  {
    size: 'M10',
    threadSize: 'M10',
    headDiameter: 16,
    headHeight: 10,
    socketSize: 8,
    standardLengths: [16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120],
  },
  {
    size: 'M12',
    threadSize: 'M12',
    headDiameter: 18,
    headHeight: 12,
    socketSize: 10,
    standardLengths: [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140],
  },
  {
    size: 'M16',
    threadSize: 'M16',
    headDiameter: 24,
    headHeight: 16,
    socketSize: 14,
    standardLengths: [25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160],
  },
  {
    size: 'M20',
    threadSize: 'M20',
    headDiameter: 30,
    headHeight: 20,
    socketSize: 17,
    standardLengths: [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200],
  },
];

/**
 * Hex nut dimensions (ISO 4032)
 */
export interface HexNutSpec {
  readonly size: string;
  readonly threadSize: string;
  readonly width: number; // across flats, mm
  readonly height: number; // mm
}

/**
 * Standard hex nut specifications (ISO 4032)
 */
export const HEX_NUT_SPECS: HexNutSpec[] = [
  { size: 'M3', threadSize: 'M3', width: 5.5, height: 2.4 },
  { size: 'M4', threadSize: 'M4', width: 7, height: 3.2 },
  { size: 'M5', threadSize: 'M5', width: 8, height: 4 },
  { size: 'M6', threadSize: 'M6', width: 10, height: 5 },
  { size: 'M8', threadSize: 'M8', width: 13, height: 6.5 },
  { size: 'M10', threadSize: 'M10', width: 17, height: 8 },
  { size: 'M12', threadSize: 'M12', width: 19, height: 10 },
  { size: 'M14', threadSize: 'M14', width: 22, height: 11 },
  { size: 'M16', threadSize: 'M16', width: 24, height: 13 },
  { size: 'M20', threadSize: 'M20', width: 30, height: 16 },
  { size: 'M24', threadSize: 'M24', width: 36, height: 19 },
];

/**
 * Flat washer dimensions (ISO 7089, ISO 7093)
 */
export interface WasherSpec {
  readonly size: string;
  readonly innerDiameter: number; // mm
  readonly outerDiameter: number; // mm
  readonly thickness: number; // mm
  readonly type: 'normal' | 'large' | 'extra-large';
}

/**
 * Standard flat washer specifications (ISO 7089 normal, ISO 7093 large)
 */
export const WASHER_SPECS: WasherSpec[] = [
  // Normal series (ISO 7089)
  { size: 'M3', innerDiameter: 3.2, outerDiameter: 7, thickness: 0.5, type: 'normal' },
  { size: 'M4', innerDiameter: 4.3, outerDiameter: 9, thickness: 0.8, type: 'normal' },
  { size: 'M5', innerDiameter: 5.3, outerDiameter: 10, thickness: 1, type: 'normal' },
  { size: 'M6', innerDiameter: 6.4, outerDiameter: 12, thickness: 1.6, type: 'normal' },
  { size: 'M8', innerDiameter: 8.4, outerDiameter: 16, thickness: 1.6, type: 'normal' },
  { size: 'M10', innerDiameter: 10.5, outerDiameter: 20, thickness: 2, type: 'normal' },
  { size: 'M12', innerDiameter: 13, outerDiameter: 24, thickness: 2.5, type: 'normal' },
  { size: 'M16', innerDiameter: 17, outerDiameter: 30, thickness: 3, type: 'normal' },
  { size: 'M20', innerDiameter: 21, outerDiameter: 37, thickness: 3, type: 'normal' },
  // Large series (ISO 7093-1)
  { size: 'M6-L', innerDiameter: 6.4, outerDiameter: 18, thickness: 1.6, type: 'large' },
  { size: 'M8-L', innerDiameter: 8.4, outerDiameter: 24, thickness: 2, type: 'large' },
  { size: 'M10-L', innerDiameter: 10.5, outerDiameter: 30, thickness: 2.5, type: 'large' },
  { size: 'M12-L', innerDiameter: 13, outerDiameter: 37, thickness: 3, type: 'large' },
  { size: 'M16-L', innerDiameter: 17, outerDiameter: 50, thickness: 3, type: 'large' },
];

/**
 * Get thread specification by size
 */
export function getThreadSpec(size: string): MetricThreadSpec | undefined {
  return (
    METRIC_COARSE_THREADS.find((t) => t.size === size) || METRIC_FINE_THREADS.find((t) => t.size === size) || undefined
  );
}

/**
 * Get hex bolt specification by size
 */
export function getHexBoltSpec(size: string): HexBoltSpec | undefined {
  return HEX_BOLT_SPECS.find((b) => b.size === size);
}

/**
 * Get socket head cap screw specification by size
 */
export function getSocketHeadCapScrewSpec(size: string): SocketHeadCapScrewSpec | undefined {
  return SOCKET_HEAD_CAP_SCREW_SPECS.find((s) => s.size === size);
}

/**
 * Get hex nut specification by size
 */
export function getHexNutSpec(size: string): HexNutSpec | undefined {
  return HEX_NUT_SPECS.find((n) => n.size === size);
}

/**
 * Get washer specification by size
 */
export function getWasherSpec(size: string, type: 'normal' | 'large' = 'normal'): WasherSpec | undefined {
  return WASHER_SPECS.find((w) => w.size === size || (w.size === `${size}-L` && type === 'large'));
}

/**
 * Calculate thread engagement length (rule of thumb: 1.5 x diameter for steel)
 */
export function calculateThreadEngagement(diameter: number, material: 'steel' | 'aluminum' | 'cast-iron'): number {
  const factors = {
    steel: 1.5,
    aluminum: 2.0,
    'cast-iron': 1.75,
  } as const;
  return diameter * factors[material];
}

/**
 * Calculate torque for bolt (approximate, use actual specs for critical applications)
 */
export function calculateBoltTorque(
  size: string,
  grade: '8.8' | '10.9' | '12.9',
  lubricated: boolean = false
): number | undefined {
  const thread = getThreadSpec(size);
  if (!thread) return undefined;

  // Approximate torque values (Nm) for 70% proof load
  const baseTorques: Record<string, Record<string, number>> = {
    M3: { '8.8': 1.1, '10.9': 1.6, '12.9': 1.9 },
    M4: { '8.8': 2.5, '10.9': 3.6, '12.9': 4.3 },
    M5: { '8.8': 5.0, '10.9': 7.2, '12.9': 8.5 },
    M6: { '8.8': 8.5, '10.9': 12, '12.9': 14.5 },
    M8: { '8.8': 21, '10.9': 30, '12.9': 36 },
    M10: { '8.8': 41, '10.9': 59, '12.9': 71 },
    M12: { '8.8': 72, '10.9': 103, '12.9': 123 },
    M16: { '8.8': 179, '10.9': 255, '12.9': 305 },
    M20: { '8.8': 350, '10.9': 500, '12.9': 600 },
  };

  const torque = baseTorques[size]?.[grade];
  if (!torque) return undefined;

  // Lubricated bolts typically use 0.7-0.8 of dry torque
  return lubricated ? torque * 0.75 : torque;
}

/**
 * Standard fastener library containing all specifications
 */
export const FASTENER_LIBRARY = {
  threads: {
    metricCoarse: METRIC_COARSE_THREADS,
    metricFine: METRIC_FINE_THREADS,
  },
  bolts: {
    hex: HEX_BOLT_SPECS,
    socketHead: SOCKET_HEAD_CAP_SCREW_SPECS,
  },
  nuts: {
    hex: HEX_NUT_SPECS,
  },
  washers: WASHER_SPECS,
} as const;
