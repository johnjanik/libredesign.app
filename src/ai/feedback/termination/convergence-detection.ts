/**
 * Convergence Detection Strategy
 *
 * Terminates when scores converge (stable plateau).
 */

import type { TerminationStrategyName, StrategyTerminationDecision } from '../types';
import { BaseTerminationStrategy, type TerminationContext } from './base-strategy';

/**
 * Convergence detection configuration
 */
export interface ConvergenceConfig {
  /** Window size for detecting convergence */
  windowSize?: number;
  /** Variance threshold for considering converged */
  varianceThreshold?: number;
  /** Minimum iterations before allowing convergence termination */
  minIterationsBeforeConvergence?: number;
}

/**
 * Convergence Detection Strategy
 */
export class ConvergenceDetectionStrategy extends BaseTerminationStrategy {
  readonly name: TerminationStrategyName = 'convergence_detection';
  private windowSize: number;
  private varianceThreshold: number;
  private minIterationsBeforeConvergence: number;

  constructor(weight: number = 1.0, config: ConvergenceConfig = {}) {
    super(weight);
    this.windowSize = config.windowSize ?? 4;
    this.varianceThreshold = config.varianceThreshold ?? 0.001;
    this.minIterationsBeforeConvergence = config.minIterationsBeforeConvergence ?? 3;
  }

  evaluate(context: TerminationContext): StrategyTerminationDecision {
    const scores = this.getScores(context);

    // Need enough iterations
    if (scores.length < this.minIterationsBeforeConvergence) {
      return {
        strategyName: this.name,
        terminate: false,
        confidence: 0,
        reason: `Only ${scores.length} iterations, need ${this.minIterationsBeforeConvergence}`,
      };
    }

    // Get recent scores
    const recentScores = scores.slice(-this.windowSize);
    if (recentScores.length < 2) {
      return {
        strategyName: this.name,
        terminate: false,
        confidence: 0,
        reason: 'Not enough scores for convergence detection',
      };
    }

    // Calculate variance
    const variance = this.calculateVariance(recentScores);
    const isConverged = variance < this.varianceThreshold;

    // Calculate confidence based on how stable the scores are
    const stability = Math.max(0, 1 - variance / 0.01); // Scale variance to confidence

    if (isConverged) {
      const currentScore = scores[scores.length - 1];
      const isGoodEnough = currentScore >= context.qualityThreshold * 0.9; // Within 10% of threshold

      if (isGoodEnough) {
        return {
          strategyName: this.name,
          terminate: true,
          confidence: stability,
          reason: `Scores converged at ${(currentScore * 100).toFixed(1)}% (variance: ${variance.toFixed(5)})`,
        };
      } else {
        return {
          strategyName: this.name,
          terminate: false,
          confidence: stability * 0.5,
          reason: `Converged but score ${(currentScore * 100).toFixed(1)}% too low`,
        };
      }
    }

    return {
      strategyName: this.name,
      terminate: false,
      confidence: stability,
      reason: `Not converged (variance: ${variance.toFixed(5)})`,
    };
  }

  /**
   * Analyze convergence pattern
   */
  analyzeConvergence(scores: number[]): {
    converged: boolean;
    convergenceRate: number;
    oscillating: boolean;
    plateau: boolean;
  } {
    if (scores.length < 3) {
      return {
        converged: false,
        convergenceRate: 0,
        oscillating: false,
        plateau: false,
      };
    }

    // Check for oscillation (alternating up/down)
    let directionChanges = 0;
    for (let i = 2; i < scores.length; i++) {
      const prev = scores[i - 1] - scores[i - 2];
      const curr = scores[i] - scores[i - 1];
      if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
        directionChanges++;
      }
    }
    const oscillating = directionChanges / (scores.length - 2) > 0.6;

    // Check for plateau
    const recentScores = scores.slice(-4);
    const variance = this.calculateVariance(recentScores);
    const plateau = variance < this.varianceThreshold;

    // Calculate convergence rate
    const improvementRates: number[] = [];
    for (let i = 1; i < scores.length; i++) {
      improvementRates.push(scores[i] - scores[i - 1]);
    }
    const avgImprovement = improvementRates.reduce((a, b) => a + b, 0) / improvementRates.length;
    const convergenceRate = Math.abs(avgImprovement);

    return {
      converged: plateau && !oscillating,
      convergenceRate,
      oscillating,
      plateau,
    };
  }
}

/**
 * Create a convergence detection strategy
 */
export function createConvergenceDetectionStrategy(
  weight?: number,
  config?: ConvergenceConfig
): ConvergenceDetectionStrategy {
  return new ConvergenceDetectionStrategy(weight, config);
}
