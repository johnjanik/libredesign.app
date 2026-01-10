/**
 * Common Gears Library
 *
 * Standard gear specifications following ISO/AGMA standards:
 * - Spur gears (ISO 54, AGMA 2000)
 * - Helical gears
 * - Bevel gears
 * - Worm gears
 * - Rack and pinion
 */

/**
 * Standard metric module values (ISO 54)
 */
export const STANDARD_MODULES = [
  0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0, 20.0,
] as const;

/**
 * Standard pressure angles
 */
export const STANDARD_PRESSURE_ANGLES = [14.5, 20, 25] as const;

/**
 * Gear tooth profile types
 */
export type GearToothProfile = 'involute' | 'cycloidal' | 'trochoidal';

/**
 * Gear quality grades (ISO 1328)
 */
export type GearQualityGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Base gear specification
 */
export interface GearSpec {
  readonly module: number; // mm (metric) or 1/DP (imperial)
  readonly numberOfTeeth: number;
  readonly pressureAngle: number; // degrees
  readonly faceWidth: number; // mm
  readonly profile: GearToothProfile;
  readonly qualityGrade: GearQualityGrade;
}

/**
 * Spur gear specification
 */
export interface SpurGearSpec extends GearSpec {
  readonly type: 'spur';
  readonly pitchDiameter: number; // mm
  readonly outerDiameter: number; // mm (addendum circle)
  readonly rootDiameter: number; // mm (dedendum circle)
  readonly toothThickness: number; // mm (at pitch circle)
  readonly addendum: number; // mm
  readonly dedendum: number; // mm
  readonly wholeDpeth: number; // mm
  readonly clearance: number; // mm
  readonly boreDiameter?: number; // mm (shaft hole)
  readonly hubDiameter?: number; // mm
  readonly hubLength?: number; // mm
}

/**
 * Helical gear specification
 */
export interface HelicalGearSpec extends GearSpec {
  readonly type: 'helical';
  readonly helixAngle: number; // degrees
  readonly hand: 'left' | 'right';
  readonly normalModule: number; // mm
  readonly transverseModule: number; // mm
  readonly pitchDiameter: number; // mm
  readonly outerDiameter: number; // mm
  readonly rootDiameter: number; // mm
  readonly axialPitch: number; // mm
  readonly lead: number; // mm
}

/**
 * Bevel gear specification
 */
export interface BevelGearSpec extends GearSpec {
  readonly type: 'bevel';
  readonly coneAngle: number; // degrees (pitch cone angle)
  readonly shaftAngle: number; // degrees (typically 90)
  readonly outerConeDiameter: number; // mm
  readonly pitchApexToBack: number; // mm
  readonly faceAngle: number; // degrees
  readonly rootAngle: number; // degrees
  readonly spiralAngle?: number; // degrees (for spiral bevel)
  readonly hand?: 'left' | 'right'; // for spiral bevel
}

/**
 * Worm specification
 */
export interface WormSpec {
  readonly type: 'worm';
  readonly module: number; // mm (axial module)
  readonly numberOfStarts: number; // number of threads
  readonly pitchDiameter: number; // mm
  readonly outerDiameter: number; // mm
  readonly rootDiameter: number; // mm
  readonly leadAngle: number; // degrees
  readonly lead: number; // mm
  readonly axialPitch: number; // mm
  readonly faceWidth: number; // mm
  readonly pressureAngle: number; // degrees
  readonly hand: 'left' | 'right';
}

/**
 * Worm wheel specification
 */
export interface WormWheelSpec extends GearSpec {
  readonly type: 'worm-wheel';
  readonly pitchDiameter: number; // mm
  readonly throatDiameter: number; // mm
  readonly outerDiameter: number; // mm
  readonly rootDiameter: number; // mm
  readonly faceWidth: number; // mm (should be > worm pitch diameter)
  readonly centerDistance: number; // mm (from worm axis)
}

/**
 * Gear rack specification
 */
export interface RackSpec {
  readonly type: 'rack';
  readonly module: number; // mm
  readonly pressureAngle: number; // degrees
  readonly toothHeight: number; // mm
  readonly length: number; // mm
  readonly width: number; // mm
  readonly thickness: number; // mm
  readonly numberOfTeeth: number;
  readonly pitch: number; // mm (circular pitch)
}

/**
 * Gear pair specification (for mating gears)
 */
export interface GearPairSpec {
  readonly centerDistance: number; // mm
  readonly gearRatio: number;
  readonly pinion: SpurGearSpec | HelicalGearSpec;
  readonly gear: SpurGearSpec | HelicalGearSpec;
  readonly backlash: number; // mm
  readonly contactRatio: number;
}

/**
 * Standard spur gear specifications (module 1, 20° pressure angle)
 */
export const STANDARD_SPUR_GEARS_M1: SpurGearSpec[] = [
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 12,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 12,
    outerDiameter: 14,
    rootDiameter: 9.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 16,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 16,
    outerDiameter: 18,
    rootDiameter: 13.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 20,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 20,
    outerDiameter: 22,
    rootDiameter: 17.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 24,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 24,
    outerDiameter: 26,
    rootDiameter: 21.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 30,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 30,
    outerDiameter: 32,
    rootDiameter: 27.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 36,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 36,
    outerDiameter: 38,
    rootDiameter: 33.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 48,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 48,
    outerDiameter: 50,
    rootDiameter: 45.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
  {
    type: 'spur',
    module: 1,
    numberOfTeeth: 60,
    pressureAngle: 20,
    faceWidth: 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 60,
    outerDiameter: 62,
    rootDiameter: 57.5,
    toothThickness: 1.571,
    addendum: 1,
    dedendum: 1.25,
    wholeDpeth: 2.25,
    clearance: 0.25,
  },
];

/**
 * Standard spur gear specifications (module 2, 20° pressure angle)
 */
export const STANDARD_SPUR_GEARS_M2: SpurGearSpec[] = [
  {
    type: 'spur',
    module: 2,
    numberOfTeeth: 12,
    pressureAngle: 20,
    faceWidth: 20,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 24,
    outerDiameter: 28,
    rootDiameter: 19,
    toothThickness: 3.142,
    addendum: 2,
    dedendum: 2.5,
    wholeDpeth: 4.5,
    clearance: 0.5,
  },
  {
    type: 'spur',
    module: 2,
    numberOfTeeth: 16,
    pressureAngle: 20,
    faceWidth: 20,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 32,
    outerDiameter: 36,
    rootDiameter: 27,
    toothThickness: 3.142,
    addendum: 2,
    dedendum: 2.5,
    wholeDpeth: 4.5,
    clearance: 0.5,
  },
  {
    type: 'spur',
    module: 2,
    numberOfTeeth: 20,
    pressureAngle: 20,
    faceWidth: 20,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 40,
    outerDiameter: 44,
    rootDiameter: 35,
    toothThickness: 3.142,
    addendum: 2,
    dedendum: 2.5,
    wholeDpeth: 4.5,
    clearance: 0.5,
  },
  {
    type: 'spur',
    module: 2,
    numberOfTeeth: 24,
    pressureAngle: 20,
    faceWidth: 20,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 48,
    outerDiameter: 52,
    rootDiameter: 43,
    toothThickness: 3.142,
    addendum: 2,
    dedendum: 2.5,
    wholeDpeth: 4.5,
    clearance: 0.5,
  },
  {
    type: 'spur',
    module: 2,
    numberOfTeeth: 30,
    pressureAngle: 20,
    faceWidth: 20,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter: 60,
    outerDiameter: 64,
    rootDiameter: 55,
    toothThickness: 3.142,
    addendum: 2,
    dedendum: 2.5,
    wholeDpeth: 4.5,
    clearance: 0.5,
  },
];

/**
 * Calculate spur gear dimensions from module and tooth count
 */
export function calculateSpurGear(
  module: number,
  numberOfTeeth: number,
  pressureAngle: number = 20,
  faceWidth?: number
): SpurGearSpec {
  const pitchDiameter = module * numberOfTeeth;
  const addendum = module;
  const dedendum = 1.25 * module;
  const clearance = 0.25 * module;

  return {
    type: 'spur',
    module,
    numberOfTeeth,
    pressureAngle,
    faceWidth: faceWidth ?? module * 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter,
    outerDiameter: pitchDiameter + 2 * addendum,
    rootDiameter: pitchDiameter - 2 * dedendum,
    toothThickness: (Math.PI * module) / 2,
    addendum,
    dedendum,
    wholeDpeth: addendum + dedendum,
    clearance,
  };
}

/**
 * Calculate helical gear dimensions
 */
export function calculateHelicalGear(
  normalModule: number,
  numberOfTeeth: number,
  helixAngle: number,
  pressureAngle: number = 20,
  faceWidth?: number,
  hand: 'left' | 'right' = 'right'
): HelicalGearSpec {
  const helixAngleRad = (helixAngle * Math.PI) / 180;
  const transverseModule = normalModule / Math.cos(helixAngleRad);
  const pitchDiameter = transverseModule * numberOfTeeth;
  const addendum = normalModule;
  const dedendum = 1.25 * normalModule;
  const axialPitch = (Math.PI * normalModule) / Math.sin(helixAngleRad);
  const lead = axialPitch * numberOfTeeth;

  return {
    type: 'helical',
    module: transverseModule,
    normalModule,
    transverseModule,
    numberOfTeeth,
    pressureAngle,
    helixAngle,
    hand,
    faceWidth: faceWidth ?? normalModule * 10,
    profile: 'involute',
    qualityGrade: 8,
    pitchDiameter,
    outerDiameter: pitchDiameter + 2 * addendum,
    rootDiameter: pitchDiameter - 2 * dedendum,
    axialPitch,
    lead,
  };
}

/**
 * Calculate gear ratio
 */
export function calculateGearRatio(driverTeeth: number, drivenTeeth: number): number {
  return drivenTeeth / driverTeeth;
}

/**
 * Calculate center distance for external spur gears
 */
export function calculateCenterDistance(module: number, teeth1: number, teeth2: number): number {
  return (module * (teeth1 + teeth2)) / 2;
}

/**
 * Calculate contact ratio for spur gears
 */
export function calculateContactRatio(
  module: number,
  teeth1: number,
  teeth2: number,
  pressureAngle: number = 20
): number {
  const pressureAngleRad = (pressureAngle * Math.PI) / 180;
  const addendum = module;

  const r1 = (module * teeth1) / 2; // pitch radius 1
  const r2 = (module * teeth2) / 2; // pitch radius 2
  const ra1 = r1 + addendum; // addendum radius 1
  const ra2 = r2 + addendum; // addendum radius 2
  const rb1 = r1 * Math.cos(pressureAngleRad); // base radius 1
  const rb2 = r2 * Math.cos(pressureAngleRad); // base radius 2

  const C = r1 + r2; // center distance

  const term1 = Math.sqrt(ra1 * ra1 - rb1 * rb1);
  const term2 = Math.sqrt(ra2 * ra2 - rb2 * rb2);
  const term3 = C * Math.sin(pressureAngleRad);

  const pb = Math.PI * module * Math.cos(pressureAngleRad); // base pitch

  return (term1 + term2 - term3) / pb;
}

/**
 * Calculate minimum number of teeth to avoid undercutting
 */
export function calculateMinimumTeeth(pressureAngle: number = 20): number {
  const pressureAngleRad = (pressureAngle * Math.PI) / 180;
  return Math.ceil(2 / (Math.sin(pressureAngleRad) * Math.sin(pressureAngleRad)));
}

/**
 * Calculate worm gear dimensions
 */
export function calculateWormGear(
  axialModule: number,
  numberOfStarts: number,
  pitchDiameter: number,
  faceWidth: number,
  pressureAngle: number = 20,
  hand: 'left' | 'right' = 'right'
): WormSpec {
  const lead = Math.PI * axialModule * numberOfStarts;
  const leadAngle = Math.atan(lead / (Math.PI * pitchDiameter)) * (180 / Math.PI);
  const addendum = axialModule;
  const dedendum = 1.2 * axialModule;

  return {
    type: 'worm',
    module: axialModule,
    numberOfStarts,
    pitchDiameter,
    outerDiameter: pitchDiameter + 2 * addendum,
    rootDiameter: pitchDiameter - 2 * dedendum,
    leadAngle,
    lead,
    axialPitch: Math.PI * axialModule,
    faceWidth,
    pressureAngle,
    hand,
  };
}

/**
 * Calculate rack dimensions
 */
export function calculateRack(
  module: number,
  numberOfTeeth: number,
  width: number,
  thickness: number,
  pressureAngle: number = 20
): RackSpec {
  const pitch = Math.PI * module;
  const addendum = module;
  const dedendum = 1.25 * module;

  return {
    type: 'rack',
    module,
    pressureAngle,
    toothHeight: addendum + dedendum,
    length: pitch * numberOfTeeth,
    width,
    thickness,
    numberOfTeeth,
    pitch,
  };
}

/**
 * Get gear by teeth count from standard library
 */
export function getStandardSpurGear(
  numberOfTeeth: number,
  module: 1 | 2 = 1
): SpurGearSpec | undefined {
  const gears = module === 1 ? STANDARD_SPUR_GEARS_M1 : STANDARD_SPUR_GEARS_M2;
  return gears.find((g) => g.numberOfTeeth === numberOfTeeth);
}

/**
 * Gear library containing all specifications
 */
export const GEAR_LIBRARY = {
  spurGears: {
    module1: STANDARD_SPUR_GEARS_M1,
    module2: STANDARD_SPUR_GEARS_M2,
  },
  standardModules: STANDARD_MODULES,
  standardPressureAngles: STANDARD_PRESSURE_ANGLES,
} as const;
