/**
 * Strategy Manager
 *
 * Selects and manages generation strategies based on iteration state.
 */

import type { AIProvider } from '@ai/providers/ai-provider';
import type {
  DesignCandidate,
  GenerationStrategy,
  ScoredCandidate,
  AdaptiveConfig,
} from '../types';
import type { Generator, GenerationContext } from './base-generator';
import { InitialGenerator } from './initial-generator';
import { RefinementGenerator } from './refinement-generator';
import { CrossoverGenerator } from './crossover-generator';
import { MutationGenerator } from './mutation-generator';
import { FreshGenerator } from './fresh-generator';
import { DiversityGenerator } from './diversity-generator';

/**
 * Strategy manager configuration
 */
export interface StrategyManagerConfig {
  /** Minimum candidates per iteration */
  minCandidatesPerIteration?: number;
  /** Strategy weights (how often to use each) */
  strategyWeights?: Partial<Record<GenerationStrategy, number>>;
}

const DEFAULT_STRATEGY_WEIGHTS: Record<GenerationStrategy, number> = {
  initial: 1.0,
  refinement: 2.0,
  crossover: 1.0,
  mutation: 1.0,
  fresh: 0.5,
  diversity: 0.5,
};

/**
 * Strategy selection result
 */
export interface StrategySelection {
  strategy: GenerationStrategy;
  count: number;
}

/**
 * Strategy Manager
 */
export class StrategyManager {
  private generators: Map<GenerationStrategy, Generator> = new Map();
  private provider: AIProvider | null = null;
  private config: StrategyManagerConfig;
  private strategyWeights: Record<GenerationStrategy, number>;
  private strategyHistory: Map<GenerationStrategy, number[]> = new Map();

  constructor(config: StrategyManagerConfig = {}) {
    this.config = config;
    this.strategyWeights = {
      ...DEFAULT_STRATEGY_WEIGHTS,
      ...config.strategyWeights,
    };

    // Initialize generators
    this.generators.set('initial', new InitialGenerator());
    this.generators.set('refinement', new RefinementGenerator());
    this.generators.set('crossover', new CrossoverGenerator());
    this.generators.set('mutation', new MutationGenerator());
    this.generators.set('fresh', new FreshGenerator());
    this.generators.set('diversity', new DiversityGenerator());
  }

  /**
   * Set the AI provider for all generators
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    for (const generator of this.generators.values()) {
      if ('setProvider' in generator) {
        (generator as { setProvider: (p: AIProvider) => void }).setProvider(provider);
      }
    }
  }

  /**
   * Generate candidates using appropriate strategies
   */
  async generateCandidates(
    context: GenerationContext,
    totalCount: number,
    adaptiveConfig?: AdaptiveConfig
  ): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    // Select strategies based on iteration and history
    const selections = this.selectStrategies(context, totalCount, adaptiveConfig);

    // Generate candidates using selected strategies
    const candidatePromises: Promise<DesignCandidate[]>[] = [];

    for (const selection of selections) {
      const generator = this.generators.get(selection.strategy);
      if (generator) {
        candidatePromises.push(generator.generate(context, selection.count));
      }
    }

    const results = await Promise.all(candidatePromises);
    const candidates = results.flat();

    // Record strategies used
    for (const selection of selections) {
      this.recordStrategyUse(selection.strategy, context.iteration);
    }

    return candidates;
  }

  /**
   * Select strategies for this iteration
   */
  selectStrategies(
    context: GenerationContext,
    totalCount: number,
    adaptiveConfig?: AdaptiveConfig
  ): StrategySelection[] {
    const selections: StrategySelection[] = [];
    let remaining = totalCount;

    // First iteration: use initial generator
    if (context.iteration === 1 || context.previousCandidates.length === 0) {
      selections.push({ strategy: 'initial', count: totalCount });
      return selections;
    }

    // Calculate strategy probabilities
    const probabilities = this.calculateProbabilities(context, adaptiveConfig);

    // Allocate candidates to strategies
    const strategies = Object.entries(probabilities)
      .filter(([, prob]) => prob > 0)
      .sort(([, a], [, b]) => b - a) as [GenerationStrategy, number][];

    for (const [strategy, prob] of strategies) {
      if (remaining <= 0) break;

      // Allocate proportionally
      const count = Math.max(1, Math.round(totalCount * prob));
      const actual = Math.min(count, remaining);

      if (actual > 0 && this.isStrategyApplicable(strategy, context)) {
        selections.push({ strategy, count: actual });
        remaining -= actual;
      }
    }

    // If no strategies selected, fall back to refinement or fresh
    if (selections.length === 0) {
      if (context.previousCandidates.length > 0) {
        selections.push({ strategy: 'refinement', count: remaining });
      } else {
        selections.push({ strategy: 'fresh', count: remaining });
      }
    }

    return selections;
  }

  /**
   * Calculate strategy probabilities based on context
   */
  private calculateProbabilities(
    context: GenerationContext,
    adaptiveConfig?: AdaptiveConfig
  ): Record<GenerationStrategy, number> {
    const probs: Record<GenerationStrategy, number> = {
      initial: 0,
      refinement: 0,
      crossover: 0,
      mutation: 0,
      fresh: 0,
      diversity: 0,
    };

    const explorationRate = adaptiveConfig?.explorationRate ?? 0.3;

    // Base probabilities from weights
    let total = 0;
    for (const [strategy, weight] of Object.entries(this.strategyWeights)) {
      if (strategy !== 'initial') { // Initial only for first iteration
        probs[strategy as GenerationStrategy] = weight;
        total += weight;
      }
    }

    // Normalize
    if (total > 0) {
      for (const strategy of Object.keys(probs) as GenerationStrategy[]) {
        probs[strategy] /= total;
      }
    }

    // Adjust based on iteration
    if (context.iteration <= 3) {
      // Early iterations: more refinement
      probs.refinement *= 1.5;
      probs.diversity *= 0.5;
    } else if (context.iteration > 5) {
      // Later iterations: more exploration
      probs.fresh *= 1.5;
      probs.diversity *= 1.5;
      probs.crossover *= 1.2;
    }

    // Adjust based on exploration rate
    if (explorationRate > 0.5) {
      probs.mutation *= 1.3;
      probs.diversity *= 1.3;
      probs.fresh *= 1.2;
    } else if (explorationRate < 0.2) {
      probs.refinement *= 1.5;
    }

    // Check if stuck (scores not improving)
    if (this.detectStagnation(context)) {
      probs.fresh *= 2;
      probs.diversity *= 2;
      probs.mutation *= 1.5;
    }

    // Renormalize
    total = Object.values(probs).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const strategy of Object.keys(probs) as GenerationStrategy[]) {
        probs[strategy] /= total;
      }
    }

    return probs;
  }

  /**
   * Check if a strategy is applicable given context
   */
  private isStrategyApplicable(
    strategy: GenerationStrategy,
    context: GenerationContext
  ): boolean {
    switch (strategy) {
      case 'initial':
        return context.iteration === 1;
      case 'refinement':
      case 'mutation':
        return context.previousCandidates.length > 0;
      case 'crossover':
        return context.previousCandidates.length >= 2;
      case 'fresh':
      case 'diversity':
        return true;
      default:
        return true;
    }
  }

  /**
   * Detect if optimization is stagnating
   */
  private detectStagnation(context: GenerationContext): boolean {
    if (context.previousCandidates.length < 3) return false;

    // Get scores from recent candidates
    const recentScores = context.previousCandidates
      .slice(-5)
      .map(c => c.qualityScore.overall);

    // Check if scores have plateaued
    const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / recentScores.length;

    // Low variance = stagnation
    return variance < 0.001;
  }

  /**
   * Record strategy usage for tracking
   */
  private recordStrategyUse(strategy: GenerationStrategy, iteration: number): void {
    if (!this.strategyHistory.has(strategy)) {
      this.strategyHistory.set(strategy, []);
    }
    this.strategyHistory.get(strategy)!.push(iteration);
  }

  /**
   * Get strategy effectiveness metrics
   */
  getStrategyEffectiveness(): Record<GenerationStrategy, { uses: number; avgIteration: number }> {
    const effectiveness: Record<GenerationStrategy, { uses: number; avgIteration: number }> = {} as any;

    for (const [strategy, iterations] of this.strategyHistory) {
      const uses = iterations.length;
      const avgIteration = uses > 0
        ? iterations.reduce((a, b) => a + b, 0) / uses
        : 0;

      effectiveness[strategy] = { uses, avgIteration };
    }

    return effectiveness;
  }

  /**
   * Update strategy weights based on effectiveness
   */
  updateWeights(
    strategyResults: Map<GenerationStrategy, number>
  ): void {
    // Simple adaptation: increase weight for successful strategies
    for (const [strategy, improvement] of strategyResults) {
      const currentWeight = this.strategyWeights[strategy];
      if (improvement > 0) {
        // Strategy led to improvement
        this.strategyWeights[strategy] = Math.min(3.0, currentWeight * 1.1);
      } else if (improvement < -0.1) {
        // Strategy led to worse results
        this.strategyWeights[strategy] = Math.max(0.1, currentWeight * 0.9);
      }
    }
  }
}

/**
 * Create a strategy manager
 */
export function createStrategyManager(
  config?: StrategyManagerConfig
): StrategyManager {
  return new StrategyManager(config);
}
