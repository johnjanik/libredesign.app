/**
 * Quality Threshold Strategy
 *
 * Terminates when quality score exceeds threshold.
 */

import type { TerminationStrategyName, StrategyTerminationDecision } from '../types';
import { BaseTerminationStrategy, type TerminationContext } from './base-strategy';

/**
 * Quality Threshold configuration
 */
export interface QualityThresholdConfig {
  /** Minimum confidence required */
  minConfidence?: number;
  /** Require consistency (score above threshold for N iterations) */
  consistencyRequired?: number;
}

/**
 * Quality Threshold Strategy
 */
export class QualityThresholdStrategy extends BaseTerminationStrategy {
  readonly name: TerminationStrategyName = 'quality_threshold';
  private minConfidence: number;
  private consistencyRequired: number;

  constructor(weight: number = 1.0, config: QualityThresholdConfig = {}) {
    super(weight);
    this.minConfidence = config.minConfidence ?? 0.7;
    this.consistencyRequired = config.consistencyRequired ?? 1;
  }

  evaluate(context: TerminationContext): StrategyTerminationDecision {
    if (context.iterations.length === 0) {
      return {
        strategyName: this.name,
        terminate: false,
        confidence: 0,
        reason: 'No iterations yet',
      };
    }

    const scores = this.getScores(context);
    const recentScores = scores.slice(-this.consistencyRequired);

    // Check if all recent scores meet threshold
    const allMeetThreshold = recentScores.every(
      s => s >= context.qualityThreshold
    );

    if (allMeetThreshold) {
      const lastIteration = context.iterations[context.iterations.length - 1];
      if (!lastIteration) {
        return {
          strategyName: this.name,
          terminate: false,
          confidence: 0,
          reason: 'No iterations available',
        };
      }
      const currentBest = lastIteration.bestCandidate;
      const confidence = currentBest.qualityScore.confidence;

      if (confidence >= this.minConfidence) {
        const lastRecentScore = recentScores[recentScores.length - 1] ?? 0;
        return {
          strategyName: this.name,
          terminate: true,
          confidence: confidence,
          reason: `Quality threshold ${(context.qualityThreshold * 100).toFixed(0)}% met with score ${(lastRecentScore * 100).toFixed(1)}%`,
        };
      } else {
        return {
          strategyName: this.name,
          terminate: false,
          confidence: confidence,
          reason: `Score meets threshold but confidence too low (${(confidence * 100).toFixed(0)}%)`,
        };
      }
    }

    const currentScore = scores[scores.length - 1] ?? 0;
    const gap = context.qualityThreshold - currentScore;

    return {
      strategyName: this.name,
      terminate: false,
      confidence: Math.max(0, 1 - gap),
      reason: `Score ${(currentScore * 100).toFixed(1)}% below threshold ${(context.qualityThreshold * 100).toFixed(0)}%`,
    };
  }
}

/**
 * Create a quality threshold strategy
 */
export function createQualityThresholdStrategy(
  weight?: number,
  config?: QualityThresholdConfig
): QualityThresholdStrategy {
  return new QualityThresholdStrategy(weight, config);
}
