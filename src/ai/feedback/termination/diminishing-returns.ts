/**
 * Diminishing Returns Strategy
 *
 * Terminates when improvement rate drops below threshold.
 */

import type { TerminationStrategyName, StrategyTerminationDecision } from '../types';
import { BaseTerminationStrategy, type TerminationContext } from './base-strategy';

/**
 * Diminishing returns configuration
 */
export interface DiminishingReturnsConfig {
  /** Window size for measuring improvement */
  windowSize?: number;
  /** Minimum improvement rate to continue */
  minImprovementRate?: number;
  /** Consider cost per improvement */
  considerCost?: boolean;
}

/**
 * Diminishing Returns Strategy
 */
export class DiminishingReturnsStrategy extends BaseTerminationStrategy {
  readonly name: TerminationStrategyName = 'diminishing_returns';
  private windowSize: number;
  private minImprovementRate: number;
  private considerCost: boolean;

  constructor(weight: number = 1.0, config: DiminishingReturnsConfig = {}) {
    super(weight);
    this.windowSize = config.windowSize ?? 3;
    this.minImprovementRate = config.minImprovementRate ?? 0.01; // 1% per iteration
    this.considerCost = config.considerCost ?? false;
  }

  evaluate(context: TerminationContext): StrategyTerminationDecision {
    const scores = this.getScores(context);

    // Need enough history
    if (scores.length < this.windowSize) {
      return {
        strategyName: this.name,
        terminate: false,
        confidence: 0,
        reason: `Only ${scores.length} iterations, need ${this.windowSize}`,
      };
    }

    // Calculate improvement rate
    const improvementRate = this.calculateImprovementRate(scores, this.windowSize);

    // If considering cost, calculate cost efficiency
    let costEfficiency = 1.0;
    if (this.considerCost) {
      costEfficiency = this.calculateCostEfficiency(context);
    }

    const effectiveImprovement = improvementRate * costEfficiency;

    // Check if improvement is below threshold
    if (effectiveImprovement < this.minImprovementRate) {
      const currentScore = scores[scores.length - 1];
      const confidence = Math.min(1, (currentScore / context.qualityThreshold));

      // Only terminate if we have a decent score
      if (currentScore >= context.qualityThreshold * 0.75) {
        return {
          strategyName: this.name,
          terminate: true,
          confidence: confidence,
          reason: `Improvement rate ${(improvementRate * 100).toFixed(2)}% below ${(this.minImprovementRate * 100).toFixed(2)}%`,
        };
      }
    }

    return {
      strategyName: this.name,
      terminate: false,
      confidence: Math.max(0, improvementRate / this.minImprovementRate - 0.5),
      reason: `Improvement rate ${(improvementRate * 100).toFixed(2)}%, threshold ${(this.minImprovementRate * 100).toFixed(2)}%`,
    };
  }

  /**
   * Calculate cost efficiency (improvement per resource unit)
   */
  private calculateCostEfficiency(context: TerminationContext): number {
    if (context.iterations.length < 2) return 1.0;

    const recent = context.iterations.slice(-3);
    const avgCost = recent.reduce((sum, i) => sum + (i.performanceMetrics.estimatedCost ?? 0), 0) / recent.length;
    const avgTime = recent.reduce((sum, i) => sum + i.performanceMetrics.totalTimeMs, 0) / recent.length;

    // Normalize cost efficiency (lower cost/time = higher efficiency)
    const costFactor = avgCost > 0 ? Math.min(1, 0.1 / avgCost) : 1;
    const timeFactor = Math.min(1, 10000 / avgTime);

    return (costFactor + timeFactor) / 2;
  }

  /**
   * Predict future improvement based on trend
   */
  predictFutureImprovement(scores: number[], lookahead: number = 3): number {
    if (scores.length < 3) return 0;

    // Fit simple linear trend
    const n = Math.min(scores.length, 5);
    const recentScores = scores.slice(-n);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentScores[i];
      sumXY += i * recentScores[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict score after lookahead iterations
    const predicted = intercept + slope * (n - 1 + lookahead);

    return predicted - scores[scores.length - 1];
  }
}

/**
 * Create a diminishing returns strategy
 */
export function createDiminishingReturnsStrategy(
  weight?: number,
  config?: DiminishingReturnsConfig
): DiminishingReturnsStrategy {
  return new DiminishingReturnsStrategy(weight, config);
}
