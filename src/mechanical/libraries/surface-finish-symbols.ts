/**
 * Surface Finish Symbols Library
 *
 * Comprehensive surface finish and texture symbol specifications following
 * ISO 1302 and ASME Y14.36 standards.
 */

// =============================================================================
// SURFACE FINISH TYPES
// =============================================================================

/**
 * Manufacturing process type for surface finish
 */
export type ManufacturingProcess =
  | 'any'              // Any manufacturing process
  | 'removal'          // Material removal required
  | 'no-removal'       // Material removal prohibited (as-cast, as-forged)
  | 'unspecified';     // Process not specified

/**
 * Surface lay direction
 */
export type SurfaceLay =
  | 'parallel'         // = Parallel to projection plane
  | 'perpendicular'    // ⊥ Perpendicular to projection plane
  | 'crossed'          // X Crossed in two oblique directions
  | 'multi-directional' // M Multi-directional
  | 'circular'         // C Circular relative to center
  | 'radial'           // R Radial from center
  | 'particulate';     // P Particulate, non-directional

/**
 * Surface roughness parameter types
 */
export type RoughnessParameter =
  | 'Ra'   // Arithmetic average roughness
  | 'Rz'   // Maximum height of profile
  | 'Rq'   // Root mean square roughness
  | 'Rt'   // Total height of profile
  | 'Rp'   // Maximum peak height
  | 'Rv'   // Maximum valley depth
  | 'Rsk'  // Skewness
  | 'Rku'  // Kurtosis
  | 'RSm'  // Mean spacing of profile elements
  | 'Rmr'  // Material ratio curve parameter
  | 'Rdq'  // Root mean square slope
  | 'Rda'; // Arithmetic mean slope

/**
 * Evaluation length standard
 */
export type EvaluationLength =
  | 'default'   // Standard evaluation length
  | 'specified' // Specified evaluation length
  | 'total';    // Over total length

// =============================================================================
// SURFACE FINISH SPECIFICATIONS
// =============================================================================

/**
 * Surface roughness specification
 */
export interface RoughnessSpec {
  parameter: RoughnessParameter;
  value: number;           // Value in micrometers (µm)
  upperLimit?: number;     // Upper limit (for range specifications)
  transmission: '16%' | '50%' | '75%';  // Transmission band
}

/**
 * Complete surface finish symbol specification
 */
export interface SurfaceFinishSpec {
  id: string;
  manufacturingProcess: ManufacturingProcess;

  // Roughness values
  roughness?: RoughnessSpec;
  secondaryRoughness?: RoughnessSpec;

  // Additional specifications
  lay?: SurfaceLay;
  machiningAllowance?: number;  // mm to be removed
  evaluationLength?: number;    // mm (cutoff length)
  samplingLength?: number;      // mm

  // Process specification
  processNotes?: string;
}

/**
 * Surface finish symbol for rendering
 */
export interface SurfaceFinishSymbol {
  id: string;
  name: string;
  description: string;
  process: ManufacturingProcess;
  symbolPath: string;  // SVG path data
  width: number;
  height: number;
}

// =============================================================================
// STANDARD SYMBOLS (ISO 1302 / ASME Y14.36)
// =============================================================================

/**
 * Basic surface finish symbols
 */
export const SURFACE_FINISH_SYMBOLS: SurfaceFinishSymbol[] = [
  {
    id: 'basic',
    name: 'Basic Symbol',
    description: 'Basic surface texture symbol - any process',
    process: 'any',
    symbolPath: 'M0,20 L10,0 L20,20',
    width: 20,
    height: 20,
  },
  {
    id: 'removal-required',
    name: 'Material Removal Required',
    description: 'Surface produced by material removal',
    process: 'removal',
    symbolPath: 'M0,20 L10,0 L20,20 M5,10 L15,10',
    width: 20,
    height: 20,
  },
  {
    id: 'no-removal',
    name: 'No Material Removal',
    description: 'Surface produced without material removal (as-cast, as-forged)',
    process: 'no-removal',
    symbolPath: 'M0,20 L10,0 L20,20 M10,0 L10,20 M10,20 A5,5 0 1,0 10,10',
    width: 20,
    height: 25,
  },
  {
    id: 'all-surfaces',
    name: 'All Surfaces',
    description: 'Apply to all surfaces of the part',
    process: 'any',
    symbolPath: 'M0,20 L10,0 L20,20 M20,20 L30,20 M30,15 L30,25',
    width: 35,
    height: 25,
  },
];

/**
 * Lay direction symbols
 */
export const LAY_SYMBOLS: { type: SurfaceLay; symbol: string; description: string }[] = [
  { type: 'parallel', symbol: '=', description: 'Lay parallel to line representing surface' },
  { type: 'perpendicular', symbol: '⊥', description: 'Lay perpendicular to line representing surface' },
  { type: 'crossed', symbol: 'X', description: 'Lay angular in both directions' },
  { type: 'multi-directional', symbol: 'M', description: 'Lay multi-directional' },
  { type: 'circular', symbol: 'C', description: 'Lay approximately circular' },
  { type: 'radial', symbol: 'R', description: 'Lay approximately radial' },
  { type: 'particulate', symbol: 'P', description: 'Lay particulate, non-directional' },
];

// =============================================================================
// STANDARD ROUGHNESS VALUES
// =============================================================================

/**
 * Standard Ra roughness values (µm) - ISO preferred series
 */
export const STANDARD_RA_VALUES = [
  0.012, 0.025, 0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.3, 12.5, 25, 50,
];

/**
 * Standard Rz roughness values (µm)
 */
export const STANDARD_RZ_VALUES = [
  0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16, 32, 63, 125, 250,
];

/**
 * Roughness grades (ISO N grades)
 */
export interface RoughnessGrade {
  grade: string;
  ra: number;        // µm
  rz: number;        // µm (approximate)
  rms: number;       // µm (approximate)
  description: string;
  typicalProcess: string[];
}

export const ROUGHNESS_GRADES: RoughnessGrade[] = [
  {
    grade: 'N1',
    ra: 0.025,
    rz: 0.1,
    rms: 0.028,
    description: 'Super finish',
    typicalProcess: ['Superfinishing', 'Lapping'],
  },
  {
    grade: 'N2',
    ra: 0.05,
    rz: 0.2,
    rms: 0.056,
    description: 'Mirror finish',
    typicalProcess: ['Lapping', 'Polishing'],
  },
  {
    grade: 'N3',
    ra: 0.1,
    rz: 0.5,
    rms: 0.11,
    description: 'High polish',
    typicalProcess: ['Honing', 'Fine grinding'],
  },
  {
    grade: 'N4',
    ra: 0.2,
    rz: 1.0,
    rms: 0.22,
    description: 'Fine finish',
    typicalProcess: ['Grinding', 'Honing'],
  },
  {
    grade: 'N5',
    ra: 0.4,
    rz: 2.0,
    rms: 0.44,
    description: 'Medium finish',
    typicalProcess: ['Grinding', 'Fine turning'],
  },
  {
    grade: 'N6',
    ra: 0.8,
    rz: 4.0,
    rms: 0.88,
    description: 'Good machined',
    typicalProcess: ['Turning', 'Boring', 'Milling'],
  },
  {
    grade: 'N7',
    ra: 1.6,
    rz: 8.0,
    rms: 1.76,
    description: 'Normal machined',
    typicalProcess: ['Turning', 'Milling', 'Drilling'],
  },
  {
    grade: 'N8',
    ra: 3.2,
    rz: 16,
    rms: 3.52,
    description: 'Rough machined',
    typicalProcess: ['Shaping', 'Rough turning'],
  },
  {
    grade: 'N9',
    ra: 6.3,
    rz: 32,
    rms: 6.93,
    description: 'Semi-rough',
    typicalProcess: ['Rough machining', 'Die casting'],
  },
  {
    grade: 'N10',
    ra: 12.5,
    rz: 63,
    rms: 13.75,
    description: 'Rough',
    typicalProcess: ['Sand casting', 'Forging'],
  },
  {
    grade: 'N11',
    ra: 25,
    rz: 125,
    rms: 27.5,
    description: 'Very rough',
    typicalProcess: ['Sand casting', 'Flame cutting'],
  },
  {
    grade: 'N12',
    ra: 50,
    rz: 250,
    rms: 55,
    description: 'As-cast/forged',
    typicalProcess: ['Sand casting', 'Hot rolling'],
  },
];

// =============================================================================
// PROCESS-ROUGHNESS MAPPING
// =============================================================================

/**
 * Typical achievable roughness ranges by manufacturing process
 */
export interface ProcessRoughnessRange {
  process: string;
  raMin: number;  // µm
  raMax: number;  // µm
  typical: number; // µm
}

export const PROCESS_ROUGHNESS_RANGES: ProcessRoughnessRange[] = [
  // Finishing processes
  { process: 'Superfinishing', raMin: 0.012, raMax: 0.1, typical: 0.05 },
  { process: 'Lapping', raMin: 0.012, raMax: 0.4, typical: 0.1 },
  { process: 'Polishing', raMin: 0.025, raMax: 0.4, typical: 0.1 },
  { process: 'Honing', raMin: 0.05, raMax: 0.8, typical: 0.4 },

  // Grinding processes
  { process: 'Cylindrical grinding', raMin: 0.1, raMax: 1.6, typical: 0.4 },
  { process: 'Surface grinding', raMin: 0.1, raMax: 1.6, typical: 0.8 },
  { process: 'Centerless grinding', raMin: 0.2, raMax: 1.6, typical: 0.8 },

  // Machining processes
  { process: 'Reaming', raMin: 0.4, raMax: 3.2, typical: 1.6 },
  { process: 'Broaching', raMin: 0.4, raMax: 3.2, typical: 1.6 },
  { process: 'Boring', raMin: 0.4, raMax: 6.3, typical: 1.6 },
  { process: 'Turning', raMin: 0.4, raMax: 12.5, typical: 3.2 },
  { process: 'Milling', raMin: 0.8, raMax: 12.5, typical: 3.2 },
  { process: 'Drilling', raMin: 1.6, raMax: 12.5, typical: 6.3 },
  { process: 'Shaping/Planing', raMin: 1.6, raMax: 12.5, typical: 6.3 },

  // Non-traditional machining
  { process: 'EDM', raMin: 0.8, raMax: 12.5, typical: 3.2 },
  { process: 'ECM', raMin: 0.4, raMax: 6.3, typical: 1.6 },
  { process: 'Laser cutting', raMin: 3.2, raMax: 25, typical: 6.3 },
  { process: 'Waterjet cutting', raMin: 3.2, raMax: 25, typical: 12.5 },

  // Forming processes
  { process: 'Die casting', raMin: 0.8, raMax: 6.3, typical: 3.2 },
  { process: 'Investment casting', raMin: 1.6, raMax: 6.3, typical: 3.2 },
  { process: 'Sand casting', raMin: 12.5, raMax: 50, typical: 25 },
  { process: 'Hot rolling', raMin: 12.5, raMax: 50, typical: 25 },
  { process: 'Cold rolling', raMin: 0.8, raMax: 6.3, typical: 1.6 },
  { process: 'Forging', raMin: 3.2, raMax: 25, typical: 12.5 },
  { process: 'Extrusion', raMin: 0.8, raMax: 6.3, typical: 3.2 },
];

// =============================================================================
// SAMPLING/CUTOFF LENGTH
// =============================================================================

/**
 * Standard sampling lengths (cutoff) based on Ra range (ISO 4288)
 */
export interface SamplingLengthSpec {
  raMin: number;  // µm
  raMax: number;  // µm
  sampling: number;  // mm
  evaluation: number;  // mm (5x sampling)
}

export const SAMPLING_LENGTHS: SamplingLengthSpec[] = [
  { raMin: 0, raMax: 0.02, sampling: 0.08, evaluation: 0.4 },
  { raMin: 0.02, raMax: 0.1, sampling: 0.25, evaluation: 1.25 },
  { raMin: 0.1, raMax: 2.0, sampling: 0.8, evaluation: 4.0 },
  { raMin: 2.0, raMax: 10.0, sampling: 2.5, evaluation: 12.5 },
  { raMin: 10.0, raMax: 80.0, sampling: 8.0, evaluation: 40.0 },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get surface finish symbol by ID
 */
export function getSurfaceSymbol(id: string): SurfaceFinishSymbol | undefined {
  return SURFACE_FINISH_SYMBOLS.find((s) => s.id === id);
}

/**
 * Get roughness grade from Ra value
 */
export function getRoughnessGrade(ra: number): RoughnessGrade | undefined {
  return ROUGHNESS_GRADES.find((g) => Math.abs(g.ra - ra) < 0.001);
}

/**
 * Get closest standard Ra value
 */
export function getClosestStandardRa(ra: number): number {
  return STANDARD_RA_VALUES.reduce((prev, curr) =>
    Math.abs(curr - ra) < Math.abs(prev - ra) ? curr : prev
  );
}

/**
 * Convert between roughness parameters (approximate)
 * @param value - Input value in µm
 * @param from - Source parameter type
 * @param to - Target parameter type
 */
export function convertRoughness(
  value: number,
  from: RoughnessParameter,
  to: RoughnessParameter
): number {
  // Approximate conversion factors (varies by surface type)
  const toRa: Record<RoughnessParameter, number> = {
    Ra: 1,
    Rz: 0.2,     // Ra ≈ Rz / 5
    Rq: 0.9,     // Ra ≈ Rq / 1.11
    Rt: 0.14,    // Ra ≈ Rt / 7
    Rp: 0.3,     // Approximate
    Rv: 0.3,     // Approximate
    Rsk: 1,      // Not convertible
    Rku: 1,      // Not convertible
    RSm: 1,      // Not convertible
    Rmr: 1,      // Not convertible
    Rdq: 1,      // Not convertible
    Rda: 1,      // Not convertible
  };

  // Convert to Ra first
  const ra = value * toRa[from];

  // Convert from Ra to target
  return ra / toRa[to];
}

/**
 * Get recommended sampling length for Ra value
 */
export function getSamplingLength(ra: number): SamplingLengthSpec {
  const spec = SAMPLING_LENGTHS.find((s) => ra >= s.raMin && ra < s.raMax);
  // Fallback to largest sampling length for values outside defined ranges
  return spec ?? SAMPLING_LENGTHS[SAMPLING_LENGTHS.length - 1]!;
}

/**
 * Get achievable roughness range for a process
 */
export function getProcessRoughness(process: string): ProcessRoughnessRange | undefined {
  return PROCESS_ROUGHNESS_RANGES.find(
    (p) => p.process.toLowerCase() === process.toLowerCase()
  );
}

/**
 * Check if a roughness value is achievable with a given process
 */
export function isRoughnessAchievable(
  process: string,
  targetRa: number
): { achievable: boolean; recommendation?: string } {
  const range = getProcessRoughness(process);
  if (!range) {
    return { achievable: false, recommendation: 'Process not found in database' };
  }

  if (targetRa < range.raMin) {
    return {
      achievable: false,
      recommendation: `${process} cannot achieve Ra ${targetRa}. Minimum achievable: Ra ${range.raMin}. Consider: Superfinishing, Lapping, or Polishing.`,
    };
  }

  if (targetRa > range.raMax) {
    return {
      achievable: true, // Can achieve rougher than max
      recommendation: `Ra ${targetRa} is rougher than typical for ${process}.`,
    };
  }

  return { achievable: true };
}

/**
 * Get lay symbol character
 */
export function getLaySymbol(lay: SurfaceLay): string {
  const found = LAY_SYMBOLS.find((l) => l.type === lay);
  return found?.symbol ?? '';
}

/**
 * Format surface finish specification as string
 */
export function formatSurfaceFinish(spec: SurfaceFinishSpec): string {
  const parts: string[] = [];

  // Roughness
  if (spec.roughness) {
    let rStr = `${spec.roughness.parameter} ${spec.roughness.value}`;
    if (spec.roughness.upperLimit) {
      rStr += ` - ${spec.roughness.upperLimit}`;
    }
    parts.push(rStr);
  }

  // Process
  if (spec.manufacturingProcess !== 'any') {
    parts.push(spec.manufacturingProcess);
  }

  // Lay
  if (spec.lay) {
    parts.push(`Lay: ${getLaySymbol(spec.lay)}`);
  }

  // Machining allowance
  if (spec.machiningAllowance) {
    parts.push(`Remove: ${spec.machiningAllowance}mm`);
  }

  return parts.join(' | ');
}

/**
 * Create a surface finish specification
 */
export function createSurfaceFinishSpec(options: {
  ra?: number;
  rz?: number;
  process?: ManufacturingProcess;
  lay?: SurfaceLay;
  machiningAllowance?: number;
}): SurfaceFinishSpec {
  const spec: SurfaceFinishSpec = {
    id: `sf-${Date.now()}`,
    manufacturingProcess: options.process ?? 'any',
  };

  if (options.ra !== undefined) {
    spec.roughness = {
      parameter: 'Ra',
      value: options.ra,
      transmission: '50%',
    };
  } else if (options.rz !== undefined) {
    spec.roughness = {
      parameter: 'Rz',
      value: options.rz,
      transmission: '50%',
    };
  }

  if (options.lay) {
    spec.lay = options.lay;
  }

  if (options.machiningAllowance) {
    spec.machiningAllowance = options.machiningAllowance;
  }

  return spec;
}

// =============================================================================
// LIBRARY EXPORT
// =============================================================================

export const SurfaceFinishLibrary = {
  // Symbol collections
  symbols: SURFACE_FINISH_SYMBOLS,
  laySymbols: LAY_SYMBOLS,

  // Standard values
  standardRaValues: STANDARD_RA_VALUES,
  standardRzValues: STANDARD_RZ_VALUES,
  roughnessGrades: ROUGHNESS_GRADES,
  processRoughnessRanges: PROCESS_ROUGHNESS_RANGES,
  samplingLengths: SAMPLING_LENGTHS,

  // Lookup functions
  getSurfaceSymbol,
  getRoughnessGrade,
  getClosestStandardRa,
  getSamplingLength,
  getProcessRoughness,
  getLaySymbol,

  // Utility functions
  convertRoughness,
  isRoughnessAchievable,
  formatSurfaceFinish,
  createSurfaceFinishSpec,
};
