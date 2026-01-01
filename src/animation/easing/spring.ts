/**
 * Spring Physics Easing
 *
 * Implements spring physics for natural, bouncy animations.
 * Supports underdamped, critically damped, and overdamped springs.
 */

import type { EasingFunction } from '../types/easing';

/**
 * Spring configuration.
 */
export interface SpringConfig {
  /** Mass of the object (default: 1) */
  readonly mass?: number;
  /** Spring stiffness (default: 100) */
  readonly stiffness?: number;
  /** Damping coefficient (default: 10) */
  readonly damping?: number;
  /** Initial velocity (default: 0) */
  readonly velocity?: number;
  /** Precision for settling detection (default: 0.01) */
  readonly precision?: number;
}

/**
 * Spring state at a point in time.
 */
export interface SpringState {
  readonly position: number;
  readonly velocity: number;
}

const DEFAULT_SPRING_CONFIG: Required<SpringConfig> = {
  mass: 1,
  stiffness: 100,
  damping: 10,
  velocity: 0,
  precision: 0.01,
};

/**
 * Create a spring easing function.
 *
 * The spring animates from 0 to 1, with optional overshoot
 * depending on the damping ratio.
 */
export function createSpringEasing(config: SpringConfig = {}): EasingFunction {
  const { mass, stiffness, damping, velocity, precision } = {
    ...DEFAULT_SPRING_CONFIG,
    ...config,
  };

  // Calculate spring parameters
  const omega0 = Math.sqrt(stiffness / mass); // Natural frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // Damping ratio

  // Estimate settling time for normalization
  const settlingTime = estimateSettlingTime(omega0, zeta, precision);

  // Create solver based on damping ratio
  const solver = createSpringSolver(omega0, zeta, velocity);

  return function springEasing(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Map input t [0,1] to physical time
    const physicalTime = t * settlingTime;

    // Solve spring equation
    const state = solver(physicalTime);

    // Map position to [0, 1] (spring starts at 0, settles at 1)
    return state.position;
  };
}

/**
 * Estimate time for spring to settle within precision.
 */
function estimateSettlingTime(
  omega0: number,
  zeta: number,
  precision: number
): number {
  if (zeta >= 1) {
    // Critically damped or overdamped - use exponential decay estimate
    const decayRate = zeta * omega0;
    return -Math.log(precision) / decayRate * 2;
  } else {
    // Underdamped - account for oscillations
    const decayRate = zeta * omega0;
    // Add extra time for oscillations to die down
    return -Math.log(precision) / decayRate * 1.5;
  }
}

/**
 * Create a spring equation solver for the given parameters.
 */
function createSpringSolver(
  omega0: number,
  zeta: number,
  v0: number
): (t: number) => SpringState {
  // Initial conditions: x(0) = 0, target = 1
  // We solve for displacement from target: y = x - 1, so y(0) = -1

  if (zeta < 1) {
    // Underdamped: oscillatory motion
    return createUnderdampedSolver(omega0, zeta, v0);
  } else if (zeta === 1) {
    // Critically damped: fastest non-oscillatory
    return createCriticallyDampedSolver(omega0, v0);
  } else {
    // Overdamped: slow non-oscillatory
    return createOverdampedSolver(omega0, zeta, v0);
  }
}

/**
 * Underdamped spring solver (zeta < 1).
 * Solution: x(t) = 1 + e^(-zeta*omega0*t) * (A*cos(omega_d*t) + B*sin(omega_d*t))
 */
function createUnderdampedSolver(
  omega0: number,
  zeta: number,
  v0: number
): (t: number) => SpringState {
  const omegaD = omega0 * Math.sqrt(1 - zeta * zeta); // Damped frequency
  const alpha = zeta * omega0;

  // Initial conditions: x(0) = 0, x'(0) = v0
  // A = x(0) - 1 = -1
  // B = (v0 + alpha * A) / omegaD
  const A = -1;
  const B = (v0 + alpha) / omegaD;

  return function solve(t: number): SpringState {
    const expTerm = Math.exp(-alpha * t);
    const cosTerm = Math.cos(omegaD * t);
    const sinTerm = Math.sin(omegaD * t);

    const position = 1 + expTerm * (A * cosTerm + B * sinTerm);
    const velocity =
      expTerm *
      ((B * omegaD - A * alpha) * cosTerm - (A * omegaD + B * alpha) * sinTerm);

    return { position, velocity };
  };
}

/**
 * Critically damped spring solver (zeta = 1).
 * Solution: x(t) = 1 + e^(-omega0*t) * (A + B*t)
 */
function createCriticallyDampedSolver(
  omega0: number,
  v0: number
): (t: number) => SpringState {
  // Initial conditions: x(0) = 0, x'(0) = v0
  // A = x(0) - 1 = -1
  // B = v0 + omega0 * A
  const A = -1;
  const B = v0 + omega0;

  return function solve(t: number): SpringState {
    const expTerm = Math.exp(-omega0 * t);

    const position = 1 + expTerm * (A + B * t);
    const velocity = expTerm * (B - omega0 * (A + B * t));

    return { position, velocity };
  };
}

/**
 * Overdamped spring solver (zeta > 1).
 * Solution: x(t) = 1 + A*e^(r1*t) + B*e^(r2*t)
 */
function createOverdampedSolver(
  omega0: number,
  zeta: number,
  v0: number
): (t: number) => SpringState {
  const sqrtTerm = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega0 * (zeta - sqrtTerm);
  const r2 = -omega0 * (zeta + sqrtTerm);

  // Initial conditions: x(0) = 0, x'(0) = v0
  // A + B = -1 (since x(0) - 1 = -1)
  // r1*A + r2*B = v0
  const A = (v0 - r2 * (-1)) / (r1 - r2);
  const B = -1 - A;

  return function solve(t: number): SpringState {
    const exp1 = Math.exp(r1 * t);
    const exp2 = Math.exp(r2 * t);

    const position = 1 + A * exp1 + B * exp2;
    const velocity = A * r1 * exp1 + B * r2 * exp2;

    return { position, velocity };
  };
}

/**
 * Spring presets for common use cases.
 */
export const springPresets = {
  /** Gentle spring with minimal overshoot */
  gentle: createSpringEasing({ mass: 1, stiffness: 120, damping: 14 }),

  /** Wobbly spring with noticeable bounce */
  wobbly: createSpringEasing({ mass: 1, stiffness: 180, damping: 12 }),

  /** Stiff spring with quick settle */
  stiff: createSpringEasing({ mass: 1, stiffness: 210, damping: 20 }),

  /** Slow spring with gradual motion */
  slow: createSpringEasing({ mass: 1, stiffness: 280, damping: 60 }),

  /** Molasses-like spring */
  molasses: createSpringEasing({ mass: 1, stiffness: 280, damping: 120 }),

  /** Default balanced spring */
  default: createSpringEasing({ mass: 1, stiffness: 170, damping: 26 }),
} as const;

/**
 * Calculate the damping ratio for a spring.
 */
export function dampingRatio(mass: number, stiffness: number, damping: number): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Check if a spring configuration is underdamped (will overshoot).
 */
export function isUnderdamped(config: SpringConfig): boolean {
  const { mass = 1, stiffness = 100, damping = 10 } = config;
  return dampingRatio(mass, stiffness, damping) < 1;
}

/**
 * Check if a spring configuration is critically damped.
 */
export function isCriticallyDamped(config: SpringConfig): boolean {
  const { mass = 1, stiffness = 100, damping = 10 } = config;
  const zeta = dampingRatio(mass, stiffness, damping);
  return Math.abs(zeta - 1) < 0.001;
}

/**
 * Check if a spring configuration is overdamped.
 */
export function isOverdamped(config: SpringConfig): boolean {
  const { mass = 1, stiffness = 100, damping = 10 } = config;
  return dampingRatio(mass, stiffness, damping) > 1;
}
