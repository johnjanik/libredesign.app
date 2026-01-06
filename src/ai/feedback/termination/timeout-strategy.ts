/**
 * Timeout Strategy
 *
 * Terminates when time or iteration limits are reached.
 */

import type { TerminationStrategyName, StrategyTerminationDecision } from '../types';
import { BaseTerminationStrategy, type TerminationContext } from './base-strategy';

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Warning threshold as fraction of timeout (0-1) */
  warningThreshold?: number;
  /** Buffer time to allow for cleanup (ms) */
  cleanupBuffer?: number;
}

/**
 * Timeout Strategy
 */
export class TimeoutStrategy extends BaseTerminationStrategy {
  readonly name: TerminationStrategyName = 'timeout';
  private warningThreshold: number;
  private cleanupBuffer: number;

  constructor(weight: number = 2.0, config: TimeoutConfig = {}) {
    super(weight);
    this.warningThreshold = config.warningThreshold ?? 0.9;
    this.cleanupBuffer = config.cleanupBuffer ?? 2000;
  }

  evaluate(context: TerminationContext): StrategyTerminationDecision {
    const elapsed = Date.now() - context.startTime;
    const remaining = context.timeoutMs - elapsed;
    const progress = elapsed / context.timeoutMs;

    // Check iteration limit
    if (context.currentIteration >= context.maxIterations) {
      return {
        strategyName: this.name,
        terminate: true,
        confidence: 1.0,
        reason: `Max iterations (${context.maxIterations}) reached`,
      };
    }

    // Check time limit
    if (remaining <= this.cleanupBuffer) {
      return {
        strategyName: this.name,
        terminate: true,
        confidence: 1.0,
        reason: `Timeout reached (${(elapsed / 1000).toFixed(1)}s of ${(context.timeoutMs / 1000).toFixed(1)}s)`,
      };
    }

    // Warning zone
    if (progress >= this.warningThreshold) {
      return {
        strategyName: this.name,
        terminate: false,
        confidence: progress,
        reason: `Approaching timeout (${(progress * 100).toFixed(0)}% time used)`,
      };
    }

    return {
      strategyName: this.name,
      terminate: false,
      confidence: 0,
      reason: `${(remaining / 1000).toFixed(1)}s remaining`,
    };
  }

  /**
   * Estimate if there's time for another iteration
   */
  canRunAnotherIteration(context: TerminationContext): boolean {
    if (context.iterations.length === 0) return true;

    // Estimate next iteration time from average
    const avgTime = context.iterations.reduce(
      (sum, i) => sum + i.performanceMetrics.totalTimeMs,
      0
    ) / context.iterations.length;

    const elapsed = Date.now() - context.startTime;
    const remaining = context.timeoutMs - elapsed;

    return remaining > avgTime + this.cleanupBuffer;
  }

  /**
   * Get estimated iterations remaining
   */
  estimateIterationsRemaining(context: TerminationContext): number {
    const iterationsFromLimit = context.maxIterations - context.currentIteration;

    if (context.iterations.length === 0) {
      return iterationsFromLimit;
    }

    const avgTime = context.iterations.reduce(
      (sum, i) => sum + i.performanceMetrics.totalTimeMs,
      0
    ) / context.iterations.length;

    const elapsed = Date.now() - context.startTime;
    const remaining = context.timeoutMs - elapsed - this.cleanupBuffer;
    const iterationsFromTime = Math.floor(remaining / avgTime);

    return Math.min(iterationsFromLimit, Math.max(0, iterationsFromTime));
  }
}

/**
 * Create a timeout strategy
 */
export function createTimeoutStrategy(
  weight?: number,
  config?: TimeoutConfig
): TimeoutStrategy {
  return new TimeoutStrategy(weight, config);
}
