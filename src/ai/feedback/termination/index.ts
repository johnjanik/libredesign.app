/**
 * Termination Strategies Module
 *
 * Strategies for deciding when to stop the feedback loop.
 */

// Base
export { BaseTerminationStrategy } from './base-strategy';
export type {
  TerminationStrategy,
  TerminationContext,
} from './base-strategy';

// Strategies
export {
  QualityThresholdStrategy,
  createQualityThresholdStrategy,
} from './quality-threshold';
export type { QualityThresholdConfig } from './quality-threshold';

export {
  ConvergenceDetectionStrategy,
  createConvergenceDetectionStrategy,
} from './convergence-detection';
export type { ConvergenceConfig } from './convergence-detection';

export {
  DiminishingReturnsStrategy,
  createDiminishingReturnsStrategy,
} from './diminishing-returns';
export type { DiminishingReturnsConfig } from './diminishing-returns';

export {
  TimeoutStrategy,
  createTimeoutStrategy,
} from './timeout-strategy';
export type { TimeoutConfig } from './timeout-strategy';

export {
  DiversityDepletionStrategy,
  createDiversityDepletionStrategy,
} from './diversity-depletion';
export type { DiversityDepletionConfig } from './diversity-depletion';

// Manager
export {
  TerminationManager,
  createTerminationManager,
} from './termination-manager';
export type { TerminationManagerConfig } from './termination-manager';
