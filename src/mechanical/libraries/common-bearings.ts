/**
 * Common Bearings Library
 *
 * Standard bearing specifications following ISO standards:
 * - Deep groove ball bearings (ISO 15)
 * - Angular contact ball bearings
 * - Cylindrical roller bearings
 * - Tapered roller bearings
 * - Needle roller bearings
 * - Thrust bearings
 */

/**
 * Deep groove ball bearing specification (ISO 15, Series 62/63)
 */
export interface DeepGrooveBallBearingSpec {
  readonly designation: string;
  readonly innerDiameter: number; // d, mm
  readonly outerDiameter: number; // D, mm
  readonly width: number; // B, mm
  readonly dynamicLoadCapacity: number; // C, kN
  readonly staticLoadCapacity: number; // C0, kN
  readonly limitingSpeed: number; // rpm (grease)
  readonly weight: number; // kg
}

/**
 * Standard deep groove ball bearings (6200 series)
 */
export const DEEP_GROOVE_BALL_BEARINGS_6200: DeepGrooveBallBearingSpec[] = [
  {
    designation: '6200',
    innerDiameter: 10,
    outerDiameter: 30,
    width: 9,
    dynamicLoadCapacity: 5.07,
    staticLoadCapacity: 2.36,
    limitingSpeed: 26000,
    weight: 0.032,
  },
  {
    designation: '6201',
    innerDiameter: 12,
    outerDiameter: 32,
    width: 10,
    dynamicLoadCapacity: 6.89,
    staticLoadCapacity: 3.1,
    limitingSpeed: 24000,
    weight: 0.037,
  },
  {
    designation: '6202',
    innerDiameter: 15,
    outerDiameter: 35,
    width: 11,
    dynamicLoadCapacity: 7.8,
    staticLoadCapacity: 3.75,
    limitingSpeed: 22000,
    weight: 0.045,
  },
  {
    designation: '6203',
    innerDiameter: 17,
    outerDiameter: 40,
    width: 12,
    dynamicLoadCapacity: 9.95,
    staticLoadCapacity: 4.75,
    limitingSpeed: 18000,
    weight: 0.065,
  },
  {
    designation: '6204',
    innerDiameter: 20,
    outerDiameter: 47,
    width: 14,
    dynamicLoadCapacity: 12.7,
    staticLoadCapacity: 6.55,
    limitingSpeed: 15000,
    weight: 0.1,
  },
  {
    designation: '6205',
    innerDiameter: 25,
    outerDiameter: 52,
    width: 15,
    dynamicLoadCapacity: 14.0,
    staticLoadCapacity: 7.8,
    limitingSpeed: 13000,
    weight: 0.11,
  },
  {
    designation: '6206',
    innerDiameter: 30,
    outerDiameter: 62,
    width: 16,
    dynamicLoadCapacity: 19.5,
    staticLoadCapacity: 11.2,
    limitingSpeed: 11000,
    weight: 0.2,
  },
  {
    designation: '6207',
    innerDiameter: 35,
    outerDiameter: 72,
    width: 17,
    dynamicLoadCapacity: 25.5,
    staticLoadCapacity: 15.3,
    limitingSpeed: 9500,
    weight: 0.29,
  },
  {
    designation: '6208',
    innerDiameter: 40,
    outerDiameter: 80,
    width: 18,
    dynamicLoadCapacity: 29.1,
    staticLoadCapacity: 17.8,
    limitingSpeed: 8500,
    weight: 0.37,
  },
  {
    designation: '6209',
    innerDiameter: 45,
    outerDiameter: 85,
    width: 19,
    dynamicLoadCapacity: 32.5,
    staticLoadCapacity: 20.4,
    limitingSpeed: 7500,
    weight: 0.41,
  },
  {
    designation: '6210',
    innerDiameter: 50,
    outerDiameter: 90,
    width: 20,
    dynamicLoadCapacity: 35.1,
    staticLoadCapacity: 23.2,
    limitingSpeed: 7000,
    weight: 0.45,
  },
];

/**
 * Standard deep groove ball bearings (6300 series - heavier)
 */
export const DEEP_GROOVE_BALL_BEARINGS_6300: DeepGrooveBallBearingSpec[] = [
  {
    designation: '6300',
    innerDiameter: 10,
    outerDiameter: 35,
    width: 11,
    dynamicLoadCapacity: 8.06,
    staticLoadCapacity: 3.4,
    limitingSpeed: 22000,
    weight: 0.05,
  },
  {
    designation: '6301',
    innerDiameter: 12,
    outerDiameter: 37,
    width: 12,
    dynamicLoadCapacity: 9.75,
    staticLoadCapacity: 4.15,
    limitingSpeed: 20000,
    weight: 0.058,
  },
  {
    designation: '6302',
    innerDiameter: 15,
    outerDiameter: 42,
    width: 13,
    dynamicLoadCapacity: 11.4,
    staticLoadCapacity: 5.4,
    limitingSpeed: 17000,
    weight: 0.075,
  },
  {
    designation: '6303',
    innerDiameter: 17,
    outerDiameter: 47,
    width: 14,
    dynamicLoadCapacity: 13.5,
    staticLoadCapacity: 6.55,
    limitingSpeed: 15000,
    weight: 0.1,
  },
  {
    designation: '6304',
    innerDiameter: 20,
    outerDiameter: 52,
    width: 15,
    dynamicLoadCapacity: 15.9,
    staticLoadCapacity: 7.8,
    limitingSpeed: 13000,
    weight: 0.13,
  },
  {
    designation: '6305',
    innerDiameter: 25,
    outerDiameter: 62,
    width: 17,
    dynamicLoadCapacity: 22.5,
    staticLoadCapacity: 11.4,
    limitingSpeed: 11000,
    weight: 0.2,
  },
  {
    designation: '6306',
    innerDiameter: 30,
    outerDiameter: 72,
    width: 19,
    dynamicLoadCapacity: 28.1,
    staticLoadCapacity: 14.6,
    limitingSpeed: 9000,
    weight: 0.3,
  },
  {
    designation: '6307',
    innerDiameter: 35,
    outerDiameter: 80,
    width: 21,
    dynamicLoadCapacity: 33.2,
    staticLoadCapacity: 18.0,
    limitingSpeed: 8000,
    weight: 0.41,
  },
  {
    designation: '6308',
    innerDiameter: 40,
    outerDiameter: 90,
    width: 23,
    dynamicLoadCapacity: 41.0,
    staticLoadCapacity: 22.4,
    limitingSpeed: 7000,
    weight: 0.58,
  },
];

/**
 * Angular contact ball bearing specification
 */
export interface AngularContactBallBearingSpec {
  readonly designation: string;
  readonly innerDiameter: number;
  readonly outerDiameter: number;
  readonly width: number;
  readonly contactAngle: 15 | 25 | 30 | 40; // degrees
  readonly dynamicLoadCapacity: number;
  readonly staticLoadCapacity: number;
  readonly limitingSpeed: number;
}

/**
 * Standard angular contact ball bearings (7200 series, 30° contact angle)
 */
export const ANGULAR_CONTACT_BALL_BEARINGS_7200: AngularContactBallBearingSpec[] = [
  {
    designation: '7200B',
    innerDiameter: 10,
    outerDiameter: 30,
    width: 9,
    contactAngle: 30,
    dynamicLoadCapacity: 5.85,
    staticLoadCapacity: 3.0,
    limitingSpeed: 26000,
  },
  {
    designation: '7201B',
    innerDiameter: 12,
    outerDiameter: 32,
    width: 10,
    contactAngle: 30,
    dynamicLoadCapacity: 7.61,
    staticLoadCapacity: 3.8,
    limitingSpeed: 24000,
  },
  {
    designation: '7202B',
    innerDiameter: 15,
    outerDiameter: 35,
    width: 11,
    contactAngle: 30,
    dynamicLoadCapacity: 8.84,
    staticLoadCapacity: 4.5,
    limitingSpeed: 22000,
  },
  {
    designation: '7203B',
    innerDiameter: 17,
    outerDiameter: 40,
    width: 12,
    contactAngle: 30,
    dynamicLoadCapacity: 11.4,
    staticLoadCapacity: 5.85,
    limitingSpeed: 18000,
  },
  {
    designation: '7204B',
    innerDiameter: 20,
    outerDiameter: 47,
    width: 14,
    contactAngle: 30,
    dynamicLoadCapacity: 14.0,
    staticLoadCapacity: 7.65,
    limitingSpeed: 15000,
  },
  {
    designation: '7205B',
    innerDiameter: 25,
    outerDiameter: 52,
    width: 15,
    contactAngle: 30,
    dynamicLoadCapacity: 15.3,
    staticLoadCapacity: 9.15,
    limitingSpeed: 13000,
  },
  {
    designation: '7206B',
    innerDiameter: 30,
    outerDiameter: 62,
    width: 16,
    contactAngle: 30,
    dynamicLoadCapacity: 21.6,
    staticLoadCapacity: 13.4,
    limitingSpeed: 11000,
  },
];

/**
 * Tapered roller bearing specification
 */
export interface TaperedRollerBearingSpec {
  readonly designation: string;
  readonly innerDiameter: number;
  readonly outerDiameter: number;
  readonly width: number;
  readonly dynamicLoadCapacity: number;
  readonly staticLoadCapacity: number;
  readonly limitingSpeed: number;
  readonly coneAngle: number; // degrees
}

/**
 * Standard tapered roller bearings (32000 series)
 */
export const TAPERED_ROLLER_BEARINGS_32000: TaperedRollerBearingSpec[] = [
  {
    designation: '32004',
    innerDiameter: 20,
    outerDiameter: 42,
    width: 15,
    dynamicLoadCapacity: 29.1,
    staticLoadCapacity: 36.5,
    limitingSpeed: 9500,
    coneAngle: 17.5,
  },
  {
    designation: '32005',
    innerDiameter: 25,
    outerDiameter: 47,
    width: 15,
    dynamicLoadCapacity: 32.5,
    staticLoadCapacity: 40.5,
    limitingSpeed: 8000,
    coneAngle: 17,
  },
  {
    designation: '32006',
    innerDiameter: 30,
    outerDiameter: 55,
    width: 17,
    dynamicLoadCapacity: 44.0,
    staticLoadCapacity: 55.0,
    limitingSpeed: 7000,
    coneAngle: 17,
  },
  {
    designation: '32007',
    innerDiameter: 35,
    outerDiameter: 62,
    width: 18,
    dynamicLoadCapacity: 52.0,
    staticLoadCapacity: 67.0,
    limitingSpeed: 6000,
    coneAngle: 17,
  },
  {
    designation: '32008',
    innerDiameter: 40,
    outerDiameter: 68,
    width: 19,
    dynamicLoadCapacity: 57.0,
    staticLoadCapacity: 73.5,
    limitingSpeed: 5500,
    coneAngle: 16.5,
  },
  {
    designation: '32009',
    innerDiameter: 45,
    outerDiameter: 75,
    width: 20,
    dynamicLoadCapacity: 66.5,
    staticLoadCapacity: 88.0,
    limitingSpeed: 5000,
    coneAngle: 16.5,
  },
  {
    designation: '32010',
    innerDiameter: 50,
    outerDiameter: 80,
    width: 20,
    dynamicLoadCapacity: 72.0,
    staticLoadCapacity: 96.0,
    limitingSpeed: 4500,
    coneAngle: 16,
  },
];

/**
 * Linear bearing specification
 */
export interface LinearBearingSpec {
  readonly designation: string;
  readonly shaftDiameter: number; // mm
  readonly outerDiameter: number; // mm
  readonly length: number; // mm
  readonly dynamicLoadCapacity: number; // kN
  readonly staticLoadCapacity: number; // kN
  readonly type: 'closed' | 'open' | 'adjustable';
}

/**
 * Standard linear ball bearings (LM series)
 */
export const LINEAR_BEARINGS_LM: LinearBearingSpec[] = [
  {
    designation: 'LM6UU',
    shaftDiameter: 6,
    outerDiameter: 12,
    length: 19,
    dynamicLoadCapacity: 0.196,
    staticLoadCapacity: 0.245,
    type: 'closed',
  },
  {
    designation: 'LM8UU',
    shaftDiameter: 8,
    outerDiameter: 15,
    length: 24,
    dynamicLoadCapacity: 0.294,
    staticLoadCapacity: 0.392,
    type: 'closed',
  },
  {
    designation: 'LM10UU',
    shaftDiameter: 10,
    outerDiameter: 19,
    length: 29,
    dynamicLoadCapacity: 0.392,
    staticLoadCapacity: 0.539,
    type: 'closed',
  },
  {
    designation: 'LM12UU',
    shaftDiameter: 12,
    outerDiameter: 21,
    length: 30,
    dynamicLoadCapacity: 0.441,
    staticLoadCapacity: 0.588,
    type: 'closed',
  },
  {
    designation: 'LM16UU',
    shaftDiameter: 16,
    outerDiameter: 28,
    length: 37,
    dynamicLoadCapacity: 0.637,
    staticLoadCapacity: 0.882,
    type: 'closed',
  },
  {
    designation: 'LM20UU',
    shaftDiameter: 20,
    outerDiameter: 32,
    length: 42,
    dynamicLoadCapacity: 0.735,
    staticLoadCapacity: 1.078,
    type: 'closed',
  },
  {
    designation: 'LM25UU',
    shaftDiameter: 25,
    outerDiameter: 40,
    length: 59,
    dynamicLoadCapacity: 1.176,
    staticLoadCapacity: 1.764,
    type: 'closed',
  },
];

/**
 * Thrust ball bearing specification
 */
export interface ThrustBallBearingSpec {
  readonly designation: string;
  readonly shaftDiameter: number; // d, mm
  readonly outerDiameter: number; // D, mm
  readonly height: number; // T, mm
  readonly dynamicLoadCapacity: number; // Ca, kN
  readonly staticLoadCapacity: number; // C0a, kN
  readonly limitingSpeed: number; // rpm
}

/**
 * Standard thrust ball bearings (51100 series)
 */
export const THRUST_BALL_BEARINGS_51100: ThrustBallBearingSpec[] = [
  {
    designation: '51100',
    shaftDiameter: 10,
    outerDiameter: 24,
    height: 9,
    dynamicLoadCapacity: 11.2,
    staticLoadCapacity: 22.4,
    limitingSpeed: 9000,
  },
  {
    designation: '51101',
    shaftDiameter: 12,
    outerDiameter: 26,
    height: 9,
    dynamicLoadCapacity: 12.1,
    staticLoadCapacity: 25.5,
    limitingSpeed: 8000,
  },
  {
    designation: '51102',
    shaftDiameter: 15,
    outerDiameter: 28,
    height: 9,
    dynamicLoadCapacity: 13.2,
    staticLoadCapacity: 28.5,
    limitingSpeed: 7000,
  },
  {
    designation: '51103',
    shaftDiameter: 17,
    outerDiameter: 30,
    height: 9,
    dynamicLoadCapacity: 14.0,
    staticLoadCapacity: 30.5,
    limitingSpeed: 6500,
  },
  {
    designation: '51104',
    shaftDiameter: 20,
    outerDiameter: 35,
    height: 10,
    dynamicLoadCapacity: 17.6,
    staticLoadCapacity: 40.0,
    limitingSpeed: 5600,
  },
  {
    designation: '51105',
    shaftDiameter: 25,
    outerDiameter: 42,
    height: 11,
    dynamicLoadCapacity: 22.5,
    staticLoadCapacity: 55.0,
    limitingSpeed: 4800,
  },
  {
    designation: '51106',
    shaftDiameter: 30,
    outerDiameter: 47,
    height: 11,
    dynamicLoadCapacity: 24.0,
    staticLoadCapacity: 60.0,
    limitingSpeed: 4300,
  },
  {
    designation: '51107',
    shaftDiameter: 35,
    outerDiameter: 52,
    height: 12,
    dynamicLoadCapacity: 27.5,
    staticLoadCapacity: 71.0,
    limitingSpeed: 3800,
  },
  {
    designation: '51108',
    shaftDiameter: 40,
    outerDiameter: 60,
    height: 13,
    dynamicLoadCapacity: 36.5,
    staticLoadCapacity: 98.0,
    limitingSpeed: 3400,
  },
];

/**
 * Get deep groove ball bearing by inner diameter
 */
export function getDeepGrooveBearingByBore(
  bore: number,
  series: '6200' | '6300' = '6200'
): DeepGrooveBallBearingSpec | undefined {
  const bearings = series === '6200' ? DEEP_GROOVE_BALL_BEARINGS_6200 : DEEP_GROOVE_BALL_BEARINGS_6300;
  return bearings.find((b) => b.innerDiameter === bore);
}

/**
 * Get bearing by designation
 */
export function getBearingByDesignation(designation: string): DeepGrooveBallBearingSpec | undefined {
  return (
    DEEP_GROOVE_BALL_BEARINGS_6200.find((b) => b.designation === designation) ||
    DEEP_GROOVE_BALL_BEARINGS_6300.find((b) => b.designation === designation)
  );
}

/**
 * Calculate bearing life (L10 in millions of revolutions)
 */
export function calculateBearingLife(
  dynamicLoadCapacity: number,
  equivalentLoad: number,
  type: 'ball' | 'roller' = 'ball'
): number {
  const exponent = type === 'ball' ? 3 : 10 / 3;
  return Math.pow(dynamicLoadCapacity / equivalentLoad, exponent);
}

/**
 * Calculate bearing life in hours
 */
export function calculateBearingLifeHours(
  dynamicLoadCapacity: number,
  equivalentLoad: number,
  rpm: number,
  type: 'ball' | 'roller' = 'ball'
): number {
  const L10 = calculateBearingLife(dynamicLoadCapacity, equivalentLoad, type);
  return (L10 * 1e6) / (60 * rpm);
}

/**
 * Calculate equivalent radial load for deep groove ball bearings
 */
export function calculateEquivalentRadialLoad(
  radialLoad: number,
  axialLoad: number,
  staticLoadCapacity: number
): number {
  const ratio = axialLoad / staticLoadCapacity;

  // Simplified calculation based on axial/radial ratio
  if (ratio <= 0.025) {
    return radialLoad;
  } else if (ratio <= 0.04) {
    return Math.max(radialLoad, 0.56 * radialLoad + 1.15 * axialLoad);
  } else if (ratio <= 0.07) {
    return Math.max(radialLoad, 0.56 * radialLoad + 1.31 * axialLoad);
  } else if (ratio <= 0.13) {
    return Math.max(radialLoad, 0.56 * radialLoad + 1.45 * axialLoad);
  } else {
    return Math.max(radialLoad, 0.56 * radialLoad + 1.68 * axialLoad);
  }
}

/**
 * Bearing library containing all specifications
 */
export const BEARING_LIBRARY = {
  deepGrooveBall: {
    series6200: DEEP_GROOVE_BALL_BEARINGS_6200,
    series6300: DEEP_GROOVE_BALL_BEARINGS_6300,
  },
  angularContactBall: {
    series7200: ANGULAR_CONTACT_BALL_BEARINGS_7200,
  },
  taperedRoller: {
    series32000: TAPERED_ROLLER_BEARINGS_32000,
  },
  linear: {
    seriesLM: LINEAR_BEARINGS_LM,
  },
  thrustBall: {
    series51100: THRUST_BALL_BEARINGS_51100,
  },
} as const;
