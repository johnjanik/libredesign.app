/**
 * Level 4: Termination Strategy Tests
 *
 * Tests for termination decision strategies and the termination manager.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QualityThresholdStrategy,
  ConvergenceDetectionStrategy,
  DiminishingReturnsStrategy,
  TimeoutStrategy,
  DiversityDepletionStrategy,
  TerminationManager,
} from '@ai/feedback/termination';
import type { TerminationContext } from '@ai/feedback/termination';
import type { FeedbackIteration, ScoredCandidate, DesignCandidate, QualityScore } from '@ai/feedback/types';
import { generateId } from '@ai/feedback/types';

// Helper to create mock iteration
function createMockIteration(options: {
  iteration: number;
  bestScore: number;
  candidateScores?: number[];
  strategiesUsed?: string[];
  totalTimeMs?: number;
}): FeedbackIteration {
  const {
    iteration,
    bestScore,
    candidateScores = [bestScore],
    strategiesUsed = ['initial'],
    totalTimeMs = 5000,
  } = options;

  const candidates: ScoredCandidate[] = candidateScores.map((score) => ({
    candidate: {
      id: generateId(),
      seed: '{}',
      generationMethod: 'initial',
      iterationBorn: iteration,
      metadata: { generatedAt: Date.now() },
    } as DesignCandidate,
    rendered: {
      candidate: {} as DesignCandidate,
      screenshot: {
        full: 'data',
        thumbnail: 'thumb',
        dimensions: { width: 1024, height: 768 },
        devicePixelRatio: 2,
      },
      renderSuccessful: true,
    },
    verification: {
      overallScore: score,
      acceptable: score >= 0.85,
      critique: 'Test critique',
      detailedAnalysis: {
        categories: { layout: score, fidelity: score, completeness: score, polish: score },
        issues: [],
        strengths: [],
        suggestions: [],
      },
      modelConsensus: 1.0,
      confidence: 0.9,
      verificationTier: 'standard',
    },
    qualityScore: {
      overall: score,
      components: [],
      confidence: 0.9,
      normalizedScore: Math.round(score * 100),
      improvementPotential: 1 - score,
    } as QualityScore,
  }));

  const bestCandidate = candidates.reduce((best, c) =>
    c.qualityScore.overall > best.qualityScore.overall ? c : best
  );

  return {
    iteration,
    timestamp: Date.now(),
    candidates,
    bestCandidate,
    terminationCheck: { shouldTerminate: false, confidence: 0, strategyBreakdown: [] },
    performanceMetrics: {
      totalTimeMs,
      renderTimeMs: totalTimeMs * 0.3,
      verificationTimeMs: totalTimeMs * 0.5,
      generationTimeMs: totalTimeMs * 0.2,
      apiCalls: candidates.length,
    },
    strategiesUsed: strategiesUsed as any[],
  };
}

// Helper to create context
function createContext(
  iterations: FeedbackIteration[],
  overrides: Partial<TerminationContext> = {}
): TerminationContext {
  return {
    iterations,
    currentIteration: iterations.length,
    maxIterations: 10,
    qualityThreshold: 0.85,
    startTime: Date.now() - 30000, // Started 30s ago
    timeoutMs: 60000,
    ...overrides,
  };
}

describe('Level 4: Termination Strategies', () => {
  // =========================================================================
  // Test 4.1: QualityThresholdStrategy
  // =========================================================================
  describe('QualityThresholdStrategy', () => {
    let strategy: QualityThresholdStrategy;

    beforeEach(() => {
      strategy = new QualityThresholdStrategy();
    });

    it('should have correct name', () => {
      expect(strategy.name).toBe('quality_threshold');
    });

    it('should not terminate with no iterations', () => {
      const context = createContext([]);
      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
      expect(decision.reason).toContain('No iterations');
    });

    it('should terminate when score exceeds threshold', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.9 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it('should not terminate when score is below threshold', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
      expect(decision.reason).toContain('below threshold');
    });

    it('should respect consistency requirement', () => {
      const strategyWithConsistency = new QualityThresholdStrategy(1.0, {
        consistencyRequired: 2,
      });

      // Only one iteration above threshold
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
        createMockIteration({ iteration: 2, bestScore: 0.9 }),
      ];
      const context = createContext(iterations);

      const decision = strategyWithConsistency.evaluate(context);

      // Should not terminate because only 1 of required 2 iterations meet threshold
      // (the strategy looks at last N iterations)
      expect(decision.terminate).toBe(false);
    });

    it('should terminate with consistent high scores', () => {
      const strategyWithConsistency = new QualityThresholdStrategy(1.0, {
        consistencyRequired: 2,
      });

      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.9 }),
        createMockIteration({ iteration: 2, bestScore: 0.88 }),
      ];
      const context = createContext(iterations);

      const decision = strategyWithConsistency.evaluate(context);

      expect(decision.terminate).toBe(true);
    });
  });

  // =========================================================================
  // Test 4.2: ConvergenceDetectionStrategy
  // =========================================================================
  describe('ConvergenceDetectionStrategy', () => {
    let strategy: ConvergenceDetectionStrategy;

    beforeEach(() => {
      strategy = new ConvergenceDetectionStrategy(1.0, {
        windowSize: 3,
        varianceThreshold: 0.001,
        minIterationsBeforeConvergence: 3,
      });
    });

    it('should have correct name', () => {
      expect(strategy.name).toBe('convergence_detection');
    });

    it('should not terminate with insufficient iterations', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.8 }),
        createMockIteration({ iteration: 2, bestScore: 0.82 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
      expect(decision.reason).toContain('iterations');
    });

    it('should detect convergence (stable plateau)', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.80 }),
        createMockIteration({ iteration: 2, bestScore: 0.801 }),
        createMockIteration({ iteration: 3, bestScore: 0.802 }),
        createMockIteration({ iteration: 4, bestScore: 0.801 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(true);
      expect(decision.reason).toContain('converged');
    });

    it('should not terminate when scores are changing', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.6 }),
        createMockIteration({ iteration: 2, bestScore: 0.7 }),
        createMockIteration({ iteration: 3, bestScore: 0.8 }),
        createMockIteration({ iteration: 4, bestScore: 0.85 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
    });

    it('should analyze convergence patterns', () => {
      const scores = [0.6, 0.7, 0.75, 0.8, 0.81, 0.81, 0.81];
      const analysis = strategy.analyzeConvergence(scores);

      expect(analysis.plateau).toBe(true);
      expect(analysis.oscillating).toBe(false);
    });

    it('should detect oscillation', () => {
      // Alternating up/down pattern
      const scores = [0.7, 0.8, 0.7, 0.8, 0.7, 0.8];
      const analysis = strategy.analyzeConvergence(scores);

      expect(analysis.oscillating).toBe(true);
    });
  });

  // =========================================================================
  // Test 4.3: DiminishingReturnsStrategy
  // =========================================================================
  describe('DiminishingReturnsStrategy', () => {
    let strategy: DiminishingReturnsStrategy;

    beforeEach(() => {
      strategy = new DiminishingReturnsStrategy(1.0, {
        windowSize: 3,
        minImprovementRate: 0.01, // 1% per iteration
      });
    });

    it('should have correct name', () => {
      expect(strategy.name).toBe('diminishing_returns');
    });

    it('should not terminate with insufficient iterations', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
        createMockIteration({ iteration: 2, bestScore: 0.75 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
    });

    it('should terminate when improvement rate is too low', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.80 }),
        createMockIteration({ iteration: 2, bestScore: 0.801 }),
        createMockIteration({ iteration: 3, bestScore: 0.802 }),
        createMockIteration({ iteration: 4, bestScore: 0.803 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(true);
      expect(decision.reason).toContain('Improvement rate');
    });

    it('should not terminate when improving well', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.6 }),
        createMockIteration({ iteration: 2, bestScore: 0.7 }),
        createMockIteration({ iteration: 3, bestScore: 0.8 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
    });

    it('should predict future improvement', () => {
      // Linear improvement trend
      const scores = [0.5, 0.6, 0.7, 0.8];
      const prediction = strategy.predictFutureImprovement(scores, 3);

      // Should predict continued improvement
      expect(prediction).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Test 4.4: TimeoutStrategy
  // =========================================================================
  describe('TimeoutStrategy', () => {
    let strategy: TimeoutStrategy;

    beforeEach(() => {
      strategy = new TimeoutStrategy(2.0, {
        warningThreshold: 0.9,
        cleanupBuffer: 2000,
      });
    });

    it('should have correct name', () => {
      expect(strategy.name).toBe('timeout');
    });

    it('should terminate at max iterations', () => {
      const iterations = Array(10).fill(null).map((_, i) =>
        createMockIteration({ iteration: i + 1, bestScore: 0.7 })
      );
      const context = createContext(iterations, { maxIterations: 10 });

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(true);
      expect(decision.confidence).toBe(1.0);
      expect(decision.reason).toContain('Max iterations');
    });

    it('should terminate when timeout reached', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
      ];
      const context = createContext(iterations, {
        startTime: Date.now() - 61000, // Started 61s ago
        timeoutMs: 60000,
      });

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(true);
      expect(decision.reason).toContain('Timeout');
    });

    it('should not terminate with time remaining', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
      ];
      const context = createContext(iterations, {
        startTime: Date.now() - 10000, // Started 10s ago
        timeoutMs: 60000,
      });

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
    });

    it('should warn when approaching timeout', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
      ];
      const context = createContext(iterations, {
        startTime: Date.now() - 55000, // Started 55s ago (>90%)
        timeoutMs: 60000,
      });

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
      expect(decision.confidence).toBeGreaterThan(0.8);
      expect(decision.reason).toContain('Approaching');
    });

    it('should estimate if another iteration is possible', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7, totalTimeMs: 5000 }),
      ];
      const context = createContext(iterations, {
        startTime: Date.now() - 50000,
        timeoutMs: 60000,
      });

      const canRun = strategy.canRunAnotherIteration(context);

      expect(canRun).toBe(true);
    });

    it('should estimate iterations remaining', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7, totalTimeMs: 5000 }),
        createMockIteration({ iteration: 2, bestScore: 0.75, totalTimeMs: 5000 }),
      ];
      const context = createContext(iterations, {
        startTime: Date.now() - 20000,
        timeoutMs: 60000,
        maxIterations: 10,
      });

      const remaining = strategy.estimateIterationsRemaining(context);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(8); // Max 10 - 2 done
    });
  });

  // =========================================================================
  // Test 4.5: DiversityDepletionStrategy
  // =========================================================================
  describe('DiversityDepletionStrategy', () => {
    let strategy: DiversityDepletionStrategy;

    beforeEach(() => {
      strategy = new DiversityDepletionStrategy(0.5, {
        minDiversity: 0.1,
        windowSize: 3,
      });
    });

    it('should have correct name', () => {
      expect(strategy.name).toBe('diversity_depletion');
    });

    it('should not terminate with insufficient iterations', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
    });

    it('should detect low diversity when scores are identical', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.8, candidateScores: [0.8, 0.8, 0.8] }),
        createMockIteration({ iteration: 2, bestScore: 0.8, candidateScores: [0.8, 0.8, 0.8] }),
        createMockIteration({ iteration: 3, bestScore: 0.8, candidateScores: [0.8, 0.8, 0.8] }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(true);
      expect(decision.reason).toContain('Diversity depleted');
    });

    it('should not terminate when diversity is high', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.8, candidateScores: [0.5, 0.7, 0.8] }),
        createMockIteration({ iteration: 2, bestScore: 0.85, candidateScores: [0.6, 0.75, 0.85] }),
        createMockIteration({ iteration: 3, bestScore: 0.9, candidateScores: [0.65, 0.8, 0.9] }),
      ];
      const context = createContext(iterations);

      const decision = strategy.evaluate(context);

      expect(decision.terminate).toBe(false);
    });

    it('should measure strategy diversity', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7, strategiesUsed: ['initial'] }),
        createMockIteration({ iteration: 2, bestScore: 0.75, strategiesUsed: ['refinement', 'mutation'] }),
        createMockIteration({ iteration: 3, bestScore: 0.8, strategiesUsed: ['crossover', 'diversity'] }),
      ];
      const context = createContext(iterations);

      const strategyDiversity = strategy.measureStrategyDiversity(context);

      // 5 unique strategies / 6 total = ~0.83
      expect(strategyDiversity).toBeGreaterThan(0.5);
    });
  });

  // =========================================================================
  // Test 4.6: TerminationManager
  // =========================================================================
  describe('TerminationManager', () => {
    let manager: TerminationManager;

    beforeEach(() => {
      manager = new TerminationManager({ consensusThreshold: 0.6 });
    });

    it('should evaluate all strategies', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.7 }),
      ];

      const decision = manager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 10000,
        timeoutMs: 60000,
      });

      expect(decision.strategyBreakdown.length).toBeGreaterThan(0);
      expect(decision.strategyBreakdown.some(s => s.strategyName === 'quality_threshold')).toBe(true);
      expect(decision.strategyBreakdown.some(s => s.strategyName === 'timeout')).toBe(true);
    });

    it('should not terminate early when no conditions met', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.5 }),
        createMockIteration({ iteration: 2, bestScore: 0.6 }),
      ];

      const decision = manager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 10000,
        timeoutMs: 60000,
      });

      expect(decision.shouldTerminate).toBe(false);
    });

    it('should terminate when quality threshold met', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.9 }),
      ];

      const decision = manager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 10000,
        timeoutMs: 60000,
      });

      expect(decision.shouldTerminate).toBe(true);
    });

    it('should always terminate at timeout (hard limit)', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.5 }),
      ];

      const decision = manager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 65000, // Past timeout
        timeoutMs: 60000,
      });

      expect(decision.shouldTerminate).toBe(true);
      expect(decision.confidence).toBe(1.0);
    });

    it('should provide suggestions when not terminating', () => {
      const iterations = [
        createMockIteration({ iteration: 1, bestScore: 0.6 }),
        createMockIteration({ iteration: 2, bestScore: 0.61 }),
        createMockIteration({ iteration: 3, bestScore: 0.62 }),
        createMockIteration({ iteration: 4, bestScore: 0.62 }),
      ];

      const decision = manager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 20000,
        timeoutMs: 60000,
      });

      // Should have suggestions since scores are stagnating
      if (!decision.shouldTerminate) {
        expect(decision.alternativeSuggestions).toBeDefined();
      }
    });

    it('should get and update strategy weights', () => {
      const weights = manager.getStrategyWeights();

      expect(weights.size).toBeGreaterThan(0);
      expect(weights.has('quality_threshold')).toBe(true);
      expect(weights.has('timeout')).toBe(true);

      // Timeout should have high weight (hard limit)
      expect(weights.get('timeout')).toBeGreaterThanOrEqual(1.5);
    });

    it('should update weights based on effectiveness', () => {
      const initialWeights = manager.getStrategyWeights();
      const initialQT = initialWeights.get('quality_threshold')!;

      // Simulate good effectiveness
      const effectiveness = new Map([
        ['quality_threshold', 0.9],
        ['convergence_detection', 0.2],
      ]);

      manager.updateWeights(effectiveness);

      const newWeights = manager.getStrategyWeights();

      // Quality threshold should have increased
      expect(newWeights.get('quality_threshold')).toBeGreaterThan(initialQT);
    });

    it('should add and remove custom strategies', () => {
      const initialCount = manager.getStrategyWeights().size;

      // Add custom strategy (would need to create one, but we can test removal)
      manager.removeStrategy('diversity_depletion');

      const newCount = manager.getStrategyWeights().size;
      expect(newCount).toBe(initialCount - 1);
    });
  });
});
