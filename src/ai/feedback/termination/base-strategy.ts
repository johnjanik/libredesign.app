/**
 * Base Termination Strategy
 *
 * Defines the contract for termination decision strategies.
 */

import type {
  FeedbackIteration,
  TerminationStrategyName,
  StrategyTerminationDecision,
} from '../types';

/**
 * Context for termination decision
 */
export interface TerminationContext {
  /** All iterations so far */
  iterations: FeedbackIteration[];
  /** Current iteration number */
  currentIteration: number;
  /** Maximum iterations allowed */
  maxIterations: number;
  /** Quality threshold for acceptance */
  qualityThreshold: number;
  /** Start time of the loop */
  startTime: number;
  /** Timeout in ms */
  timeoutMs: number;
}

/**
 * Base Termination Strategy interface
 */
export interface TerminationStrategy {
  /** Strategy name */
  readonly name: TerminationStrategyName;
  /** Weight for this strategy in fusion */
  weight: number;
  /** Evaluate if loop should terminate */
  evaluate(context: TerminationContext): StrategyTerminationDecision;
}

/**
 * Abstract base class for termination strategies
 */
export abstract class BaseTerminationStrategy implements TerminationStrategy {
  abstract readonly name: TerminationStrategyName;
  weight: number;

  constructor(weight: number = 1.0) {
    this.weight = weight;
  }

  abstract evaluate(context: TerminationContext): StrategyTerminationDecision;

  /**
   * Get scores from iterations
   */
  protected getScores(context: TerminationContext): number[] {
    return context.iterations.map(i => i.bestCandidate.qualityScore.overall);
  }

  /**
   * Calculate improvement rate
   */
  protected calculateImprovementRate(scores: number[], windowSize: number = 3): number {
    if (scores.length < 2) return 0;

    const recent = scores.slice(-windowSize);
    if (recent.length < 2) return 0;

    // Average improvement per iteration
    let totalImprovement = 0;
    for (let i = 1; i < recent.length; i++) {
      totalImprovement += recent[i] - recent[i - 1];
    }

    return totalImprovement / (recent.length - 1);
  }

  /**
   * Calculate variance of scores
   */
  protected calculateVariance(scores: number[]): number {
    if (scores.length < 2) return 0;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));

    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }
}
