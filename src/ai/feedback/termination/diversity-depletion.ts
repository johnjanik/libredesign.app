/**
 * Diversity Depletion Strategy
 *
 * Terminates when candidate diversity drops too low.
 */

import type { TerminationStrategyName, StrategyTerminationDecision } from '../types';
import { BaseTerminationStrategy, type TerminationContext } from './base-strategy';

/**
 * Diversity depletion configuration
 */
export interface DiversityDepletionConfig {
  /** Minimum diversity threshold (0-1) */
  minDiversity?: number;
  /** Window size for measuring diversity */
  windowSize?: number;
}

/**
 * Diversity Depletion Strategy
 */
export class DiversityDepletionStrategy extends BaseTerminationStrategy {
  readonly name: TerminationStrategyName = 'diversity_depletion';
  private minDiversity: number;
  private windowSize: number;

  constructor(weight: number = 0.5, config: DiversityDepletionConfig = {}) {
    super(weight);
    this.minDiversity = config.minDiversity ?? 0.1;
    this.windowSize = config.windowSize ?? 3;
  }

  evaluate(context: TerminationContext): StrategyTerminationDecision {
    if (context.iterations.length < this.windowSize) {
      return {
        strategyName: this.name,
        terminate: false,
        confidence: 0,
        reason: `Only ${context.iterations.length} iterations, need ${this.windowSize}`,
      };
    }

    // Calculate diversity metrics
    const diversity = this.measureDiversity(context);

    if (diversity < this.minDiversity) {
      const scores = this.getScores(context);
      const currentScore = scores[scores.length - 1] ?? 0;

      // Only terminate if we have a reasonable score
      if (currentScore >= context.qualityThreshold * 0.8) {
        return {
          strategyName: this.name,
          terminate: true,
          confidence: 0.7,
          reason: `Diversity depleted (${(diversity * 100).toFixed(1)}% < ${(this.minDiversity * 100).toFixed(1)}%)`,
        };
      } else {
        return {
          strategyName: this.name,
          terminate: false,
          confidence: 0.3,
          reason: `Low diversity but score too low to terminate`,
        };
      }
    }

    return {
      strategyName: this.name,
      terminate: false,
      confidence: Math.min(1, diversity / this.minDiversity),
      reason: `Diversity at ${(diversity * 100).toFixed(1)}%`,
    };
  }

  /**
   * Measure diversity across recent candidates
   */
  private measureDiversity(context: TerminationContext): number {
    const recentIterations = context.iterations.slice(-this.windowSize);
    if (recentIterations.length < 2) return 1.0;

    // Collect all scores from recent candidates
    const allScores: number[] = [];
    const categoryScores: {
      layout: number[];
      fidelity: number[];
      completeness: number[];
      polish: number[];
    } = {
      layout: [],
      fidelity: [],
      completeness: [],
      polish: [],
    };

    for (const iteration of recentIterations) {
      for (const candidate of iteration.candidates) {
        allScores.push(candidate.qualityScore.overall);
        const cats = candidate.verification.detailedAnalysis.categories;
        categoryScores.layout.push(cats.layout);
        categoryScores.fidelity.push(cats.fidelity);
        categoryScores.completeness.push(cats.completeness);
        categoryScores.polish.push(cats.polish);
      }
    }

    // Calculate variance as diversity proxy
    const overallVariance = this.calculateVariance(allScores);
    const layoutVariance = this.calculateVariance(categoryScores.layout);
    const fidelityVariance = this.calculateVariance(categoryScores.fidelity);
    const completenessVariance = this.calculateVariance(categoryScores.completeness);
    const polishVariance = this.calculateVariance(categoryScores.polish);

    // Combine variances (higher variance = more diversity)
    // Scale: typical variance range is 0-0.1, we want 0-1
    const avgVariance = (
      overallVariance +
      layoutVariance +
      fidelityVariance +
      completenessVariance +
      polishVariance
    ) / 5;

    // Convert to diversity score (0-1)
    return Math.min(1, avgVariance * 10);
  }

  /**
   * Get strategy diversity (how many different strategies are being used)
   */
  measureStrategyDiversity(context: TerminationContext): number {
    const recentIterations = context.iterations.slice(-this.windowSize);
    if (recentIterations.length === 0) return 1.0;

    const strategies = new Set<string>();
    for (const iteration of recentIterations) {
      for (const strategy of iteration.strategiesUsed) {
        strategies.add(strategy);
      }
    }

    // Normalize: 6 possible strategies
    return strategies.size / 6;
  }
}

/**
 * Create a diversity depletion strategy
 */
export function createDiversityDepletionStrategy(
  weight?: number,
  config?: DiversityDepletionConfig
): DiversityDepletionStrategy {
  return new DiversityDepletionStrategy(weight, config);
}
