/**
 * Generators Module
 *
 * Design candidate generation strategies.
 */

// Base
export { BaseGenerator } from './base-generator';
export type {
  Generator,
  GeneratorConfig,
  GenerationContext,
} from './base-generator';

// Implementations
export { InitialGenerator, createInitialGenerator } from './initial-generator';
export type { InitialGeneratorConfig } from './initial-generator';

export { RefinementGenerator, createRefinementGenerator } from './refinement-generator';
export type { RefinementGeneratorConfig } from './refinement-generator';

export { CrossoverGenerator, createCrossoverGenerator } from './crossover-generator';
export type { CrossoverGeneratorConfig } from './crossover-generator';

export { MutationGenerator, createMutationGenerator } from './mutation-generator';
export type { MutationGeneratorConfig, MutationType } from './mutation-generator';

export { FreshGenerator, createFreshGenerator } from './fresh-generator';
export type { FreshGeneratorConfig } from './fresh-generator';

export { DiversityGenerator, createDiversityGenerator } from './diversity-generator';
export type { DiversityGeneratorConfig, DiversityDimension } from './diversity-generator';

// Strategy Manager
export { StrategyManager, createStrategyManager } from './strategy-manager';
export type { StrategyManagerConfig, StrategySelection } from './strategy-manager';
