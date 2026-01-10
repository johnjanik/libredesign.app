/**
 * Mechanical Libraries
 *
 * Standard component libraries for mechanical design:
 * - Common fasteners (ISO/ANSI threads, bolts, nuts, washers)
 * - Common bearings (ball, roller, linear, thrust)
 * - Common gears (spur, helical, bevel, worm, rack)
 * - Welding symbols (AWS A2.4 / ISO 2553)
 * - Surface finish symbols (ISO 1302 / ASME Y14.36)
 */

// Fastener library
export {
  // Thread specifications
  METRIC_COARSE_THREADS,
  METRIC_FINE_THREADS,
  // Bolt specifications
  HEX_BOLT_SPECS,
  SOCKET_HEAD_CAP_SCREW_SPECS,
  // Nut specifications
  HEX_NUT_SPECS,
  // Washer specifications
  WASHER_SPECS,
  // Utility functions
  getThreadSpec,
  getHexBoltSpec,
  getSocketHeadCapScrewSpec,
  getHexNutSpec,
  getWasherSpec,
  calculateThreadEngagement,
  calculateBoltTorque,
  // Complete library
  FASTENER_LIBRARY,
} from './common-fasteners';

export type {
  MetricThreadSpec,
  HexBoltSpec,
  SocketHeadCapScrewSpec,
  HexNutSpec,
  WasherSpec,
} from './common-fasteners';

// Bearing library
export {
  // Deep groove ball bearings
  DEEP_GROOVE_BALL_BEARINGS_6200,
  DEEP_GROOVE_BALL_BEARINGS_6300,
  // Angular contact ball bearings
  ANGULAR_CONTACT_BALL_BEARINGS_7200,
  // Tapered roller bearings
  TAPERED_ROLLER_BEARINGS_32000,
  // Linear bearings
  LINEAR_BEARINGS_LM,
  // Thrust bearings
  THRUST_BALL_BEARINGS_51100,
  // Utility functions
  getDeepGrooveBearingByBore,
  getBearingByDesignation,
  calculateBearingLife,
  calculateBearingLifeHours,
  calculateEquivalentRadialLoad,
  // Complete library
  BEARING_LIBRARY,
} from './common-bearings';

export type {
  DeepGrooveBallBearingSpec,
  AngularContactBallBearingSpec,
  TaperedRollerBearingSpec,
  LinearBearingSpec,
  ThrustBallBearingSpec,
} from './common-bearings';

// Gear library
export {
  // Standard values
  STANDARD_MODULES,
  STANDARD_PRESSURE_ANGLES,
  STANDARD_SPUR_GEARS_M1,
  STANDARD_SPUR_GEARS_M2,
  // Utility functions
  calculateSpurGear,
  calculateHelicalGear,
  calculateWormGear,
  calculateRack,
  calculateGearRatio,
  calculateCenterDistance,
  calculateContactRatio,
  calculateMinimumTeeth,
  getStandardSpurGear,
  // Complete library
  GEAR_LIBRARY,
} from './common-gears';

export type {
  GearToothProfile,
  GearQualityGrade,
  GearSpec,
  SpurGearSpec,
  HelicalGearSpec,
  BevelGearSpec,
  WormSpec,
  WormWheelSpec,
  RackSpec,
  GearPairSpec,
} from './common-gears';

// Welding symbols library
export {
  // Symbol collections
  WELD_TYPE_SYMBOLS,
  SUPPLEMENTARY_SYMBOLS,
  WELDING_PROCESSES,
  // Standard values
  STANDARD_FILLET_SIZES,
  STANDARD_GROOVE_ANGLES,
  STANDARD_ROOT_OPENINGS,
  STANDARD_ROOT_FACES,
  // Utility functions
  getWeldSymbol,
  getWeldSymbolById,
  getSupplementarySymbol,
  getWeldingProcess,
  calculateFilletThroat,
  calculateGrooveThroat,
  getMinimumFilletSize,
  getMaximumFilletSize,
  formatWeldingSymbol,
  // Complete library
  WeldingSymbolsLibrary,
} from './welding-symbols';

export type {
  WeldJointType,
  GrooveType,
  WeldType,
  WeldingProcess,
  WeldContour,
  FinishingMethod,
  WeldSymbolSpec,
  SupplementarySymbol,
  WeldingSymbolSpec,
  WeldingProcessSpec,
} from './welding-symbols';

// Surface finish symbols library
export {
  // Symbol collections
  SURFACE_FINISH_SYMBOLS,
  LAY_SYMBOLS,
  // Standard values
  STANDARD_RA_VALUES,
  STANDARD_RZ_VALUES,
  ROUGHNESS_GRADES,
  PROCESS_ROUGHNESS_RANGES,
  SAMPLING_LENGTHS,
  // Utility functions
  getSurfaceSymbol,
  getRoughnessGrade,
  getClosestStandardRa,
  getSamplingLength,
  getProcessRoughness,
  getLaySymbol,
  convertRoughness,
  isRoughnessAchievable,
  formatSurfaceFinish,
  createSurfaceFinishSpec,
  // Complete library
  SurfaceFinishLibrary,
} from './surface-finish-symbols';

export type {
  ManufacturingProcess,
  SurfaceLay,
  RoughnessParameter,
  EvaluationLength,
  RoughnessSpec,
  SurfaceFinishSpec,
  SurfaceFinishSymbol,
  RoughnessGrade,
  ProcessRoughnessRange,
  SamplingLengthSpec,
} from './surface-finish-symbols';
