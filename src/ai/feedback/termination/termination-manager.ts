/**
 * Termination Manager
 *
 * Orchestrates multiple termination strategies and fuses their decisions.
 */

import type {
  FeedbackIteration,
  TerminationDecision,
  StrategyTerminationDecision,
  TerminationSuggestion,
} from '../types';
import type { TerminationStrategy, TerminationContext } from './base-strategy';
import { QualityThresholdStrategy } from './quality-threshold';
import { ConvergenceDetectionStrategy } from './convergence-detection';
import { DiminishingReturnsStrategy } from './diminishing-returns';
import { TimeoutStrategy } from './timeout-strategy';
import { DiversityDepletionStrategy } from './diversity-depletion';

/**
 * Termination manager configuration
 */
export interface TerminationManagerConfig {
  /** Consensus threshold for termination (0-1) */
  consensusThreshold?: number;
  /** Enable adaptive weights */
  adaptiveWeights?: boolean;
}

const DEFAULT_CONFIG: Required<TerminationManagerConfig> = {
  consensusThreshold: 0.6,
  adaptiveWeights: true,
};

/**
 * Termination Manager
 */
export class TerminationManager {
  private strategies: TerminationStrategy[] = [];
  private config: Required<TerminationManagerConfig>;

  constructor(config: TerminationManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize default strategies
    this.strategies = [
      new QualityThresholdStrategy(1.0),
      new ConvergenceDetectionStrategy(0.8),
      new DiminishingReturnsStrategy(0.7),
      new TimeoutStrategy(2.0),        // High weight - hard limit
      new DiversityDepletionStrategy(0.5),
    ];
  }

  /**
   * Add a custom strategy
   */
  addStrategy(strategy: TerminationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove a strategy by name
   */
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  /**
   * Evaluate all strategies and make a fused decision
   */
  evaluate(
    iterations: FeedbackIteration[],
    options: {
      maxIterations: number;
      qualityThreshold: number;
      startTime: number;
      timeoutMs: number;
    }
  ): TerminationDecision {
    const context: TerminationContext = {
      iterations,
      currentIteration: iterations.length,
      maxIterations: options.maxIterations,
      qualityThreshold: options.qualityThreshold,
      startTime: options.startTime,
      timeoutMs: options.timeoutMs,
    };

    // Evaluate all strategies
    const decisions: StrategyTerminationDecision[] = [];
    for (const strategy of this.strategies) {
      const decision = strategy.evaluate(context);
      decisions.push(decision);
    }

    // Fuse decisions
    return this.fuseDecisions(decisions, context);
  }

  /**
   * Fuse multiple strategy decisions
   */
  private fuseDecisions(
    decisions: StrategyTerminationDecision[],
    context: TerminationContext
  ): TerminationDecision {
    // Calculate weighted vote
    let terminateVote = 0;
    let totalWeight = 0;
    let maxConfidence = 0;
    const terminateReasons: string[] = [];
    const continueReasons: string[] = [];

    for (const decision of decisions) {
      const strategy = this.strategies.find(s => s.name === decision.strategyName);
      const weight = strategy?.weight ?? 1.0;
      totalWeight += weight;

      if (decision.terminate) {
        terminateVote += weight * decision.confidence;
        terminateReasons.push(`${decision.strategyName}: ${decision.reason}`);
      } else {
        continueReasons.push(`${decision.strategyName}: ${decision.reason}`);
      }

      maxConfidence = Math.max(maxConfidence, decision.confidence);
    }

    const terminateScore = totalWeight > 0 ? terminateVote / totalWeight : 0;

    // Check for hard termination (timeout or max iterations)
    const hardTermination = decisions.find(
      d => d.terminate && d.strategyName === 'timeout' && d.confidence === 1.0
    );

    // Check for quality threshold met (high priority termination)
    const qualityMet = decisions.find(
      d => d.terminate && d.strategyName === 'quality_threshold' && d.confidence >= 0.9
    );

    const shouldTerminate = hardTermination !== undefined ||
                           qualityMet !== undefined ||
                           terminateScore >= this.config.consensusThreshold;

    // Generate suggestions if not terminating
    const suggestions = shouldTerminate
      ? []
      : this.generateSuggestions(decisions, context);

    // Build combined reason
    const reason = shouldTerminate
      ? terminateReasons.join('; ')
      : continueReasons.join('; ');

    // Calculate confidence: 1.0 for hard termination, otherwise based on vote
    let confidence: number;
    if (hardTermination) {
      confidence = 1.0;
    } else if (shouldTerminate) {
      confidence = Math.max(terminateScore, maxConfidence);
    } else {
      confidence = 1 - terminateScore;
    }

    return {
      shouldTerminate,
      reason: reason || 'No specific reason',
      confidence,
      strategyBreakdown: decisions,
      ...(suggestions.length > 0 ? { alternativeSuggestions: suggestions } : {}),
    };
  }

  /**
   * Generate suggestions for improving results
   */
  private generateSuggestions(
    decisions: StrategyTerminationDecision[],
    context: TerminationContext
  ): TerminationSuggestion[] {
    const suggestions: TerminationSuggestion[] = [];

    // Analyze patterns
    const convergenceDecision = decisions.find(d => d.strategyName === 'convergence_detection');
    const diminishingDecision = decisions.find(d => d.strategyName === 'diminishing_returns');
    const diversityDecision = decisions.find(d => d.strategyName === 'diversity_depletion');

    // Suggest increasing diversity if converged/stagnant
    if (convergenceDecision?.confidence && convergenceDecision.confidence > 0.7) {
      suggestions.push({
        type: 'increase_diversity',
        reason: 'Scores have converged but below threshold',
        action: 'Try fresh or diversity generation strategies',
        confidence: 0.7,
      });
    }

    // Suggest changing strategy if diminishing returns
    if (diminishingDecision?.confidence && diminishingDecision.confidence > 0.5) {
      suggestions.push({
        type: 'change_strategy',
        reason: 'Improvement rate is low',
        action: 'Switch to crossover or mutation strategies',
        confidence: 0.6,
      });
    }

    // Suggest adjusting threshold if close
    const scores = context.iterations.map(i => i.bestCandidate.qualityScore.overall);
    const currentScore = scores[scores.length - 1];
    if (currentScore !== undefined && currentScore >= context.qualityThreshold * 0.9) {
      suggestions.push({
        type: 'adjust_threshold',
        reason: `Current score ${(currentScore * 100).toFixed(1)}% is close to threshold`,
        action: 'Consider lowering threshold or continuing for minor improvements',
        confidence: 0.5,
      });
    }

    // Suggest continuing if diversity is good
    if (diversityDecision && !diversityDecision.terminate && diversityDecision.confidence > 0.5) {
      suggestions.push({
        type: 'continue',
        reason: 'Candidate diversity is healthy',
        action: 'Continue exploring the design space',
        confidence: 0.6,
      });
    }

    // Detect score stagnation and suggest action
    if (scores.length >= 3) {
      const recentScores = scores.slice(-3);
      const scoreRange = Math.max(...recentScores) - Math.min(...recentScores);
      const lastScore = scores[scores.length - 1];
      if (lastScore !== undefined && scoreRange < 0.05 && lastScore < context.qualityThreshold) {
        suggestions.push({
          type: 'change_strategy',
          reason: `Scores stagnating around ${(lastScore * 100).toFixed(1)}%`,
          action: 'Try different generation strategies or increase exploration',
          confidence: 0.65,
        });
      }
    }

    // Always provide at least one suggestion if we're not terminating
    if (suggestions.length === 0 && context.iterations.length > 0) {
      suggestions.push({
        type: 'continue',
        reason: 'No specific issues detected',
        action: 'Continue iterating to improve quality',
        confidence: 0.5,
      });
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Update strategy weights based on effectiveness
   */
  updateWeights(effectivenessMetrics: Map<string, number>): void {
    if (!this.config.adaptiveWeights) return;

    for (const strategy of this.strategies) {
      const effectiveness = effectivenessMetrics.get(strategy.name);
      if (effectiveness !== undefined) {
        // Adjust weight based on how well the strategy predicted outcomes
        const adjustment = effectiveness > 0.7 ? 1.1 : effectiveness < 0.3 ? 0.9 : 1.0;
        strategy.weight = Math.max(0.1, Math.min(3.0, strategy.weight * adjustment));
      }
    }
  }

  /**
   * Get current strategy weights
   */
  getStrategyWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    for (const strategy of this.strategies) {
      weights.set(strategy.name, strategy.weight);
    }
    return weights;
  }
}

/**
 * Create a termination manager
 */
export function createTerminationManager(
  config?: TerminationManagerConfig
): TerminationManager {
  return new TerminationManager(config);
}
