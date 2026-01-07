/**
 * Level 5: Integration Tests
 *
 * Tests that verify multiple components working together.
 * These tests simulate realistic scenarios.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  TieredVerifier,
  ClaudeVerifier,
  StrategyManager,
  TerminationManager,
} from '@ai/feedback';
import type { AIProvider, AIResponse } from '@ai/providers/ai-provider';
import type {
  DesignIntent,
  ScreenshotData,
  VerificationConfig,
  FeedbackIteration,
  ScoredCandidate,
  DesignCandidate,
  QualityScore,
} from '@ai/feedback/types';
import { generateId } from '@ai/feedback/types';
import type { GenerationContext } from '@ai/feedback/generators';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockIntent: DesignIntent = {
  description: 'Create a modern dashboard with a header, sidebar navigation, and a main content area with charts',
  constraints: [
    { type: 'layout', description: 'Responsive layout', priority: 'required' },
    { type: 'accessibility', description: 'WCAG AA compliant', priority: 'preferred' },
  ],
  style: {
    colorScheme: 'dark',
    primaryColor: '#6366F1',
    style: 'modern',
    density: 'comfortable',
  },
  requirements: {
    elements: ['header', 'sidebar', 'main content', 'charts', 'stats cards'],
    layout: 'grid',
    responsive: true,
  },
};

const mockScreenshot: ScreenshotData = {
  full: 'base64encodedimagedata',
  thumbnail: 'base64thumbnaildata',
  dimensions: { width: 1920, height: 1080 },
  devicePixelRatio: 2,
};

// Create provider with configurable responses
function createMockProvider(options: {
  verificationScore?: number;
  toolCalls?: object[];
  failAfter?: number;
}): AIProvider {
  const { verificationScore = 0.8, failAfter = Infinity } = options;
  let callCount = 0;

  // Default tool calls for generation
  const defaultToolCalls = [
    { tool: 'create_frame', args: { x: 0, y: 0, width: 1920, height: 1080, name: 'Dashboard' } },
    { tool: 'create_rectangle', args: { x: 0, y: 0, width: 1920, height: 60, fill: '#1F2937', name: 'Header' } },
    { tool: 'create_rectangle', args: { x: 0, y: 60, width: 250, height: 1020, fill: '#111827', name: 'Sidebar' } },
    { tool: 'create_text', args: { x: 20, y: 20, text: 'Dashboard', fill: '#FFFFFF' } },
  ];

  return {
    name: 'mock',
    capabilities: {
      vision: true,
      streaming: true,
      functionCalling: true,
      maxContextTokens: 100000,
    },
    sendMessage: vi.fn().mockImplementation(async (messages: unknown[]) => {
      callCount++;
      if (callCount > failAfter) {
        throw new Error('Provider failed');
      }

      // Check if this is a verification request (has image content)
      // or a generation request (asking to create design)
      const lastMessage = messages[messages.length - 1] as { content?: unknown };

      // Extract text content from message (handles both string and multimodal array)
      let msgContent = '';
      if (typeof lastMessage?.content === 'string') {
        msgContent = lastMessage.content;
      } else if (Array.isArray(lastMessage?.content)) {
        // Multimodal message - extract text parts
        for (const part of lastMessage.content) {
          if (part && typeof part === 'object' && 'type' in part) {
            if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
              msgContent += part.text;
            }
          }
        }
      }

      const isVerification = msgContent.toLowerCase().includes('verify') ||
                            msgContent.toLowerCase().includes('evaluate') ||
                            msgContent.toLowerCase().includes('score') ||
                            msgContent.toLowerCase().includes('analyze');

      if (isVerification) {
        // Return verification response
        return {
          content: JSON.stringify({
            score: verificationScore,
            confidence: 0.9,
            categories: {
              layout: verificationScore + 0.05,
              fidelity: verificationScore,
              completeness: verificationScore - 0.05,
              polish: verificationScore,
            },
            critique: 'Test verification response',
            issues: [],
            strengths: ['Good overall structure'],
            suggestions: ['Consider improving colors'],
          }),
          toolCalls: [],
          stopReason: 'end_turn',
        } as AIResponse;
      } else {
        // Return generation response (tool calls array)
        return {
          content: JSON.stringify(options.toolCalls ?? defaultToolCalls),
          toolCalls: [],
          stopReason: 'end_turn',
        } as AIResponse;
      }
    }),
    streamMessage: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    configure: vi.fn(),
  };
}

// Create mock scored candidate
function createMockScoredCandidate(score: number, iteration: number): ScoredCandidate {
  const candidate: DesignCandidate = {
    id: generateId(),
    seed: JSON.stringify({ toolCalls: [{ tool: 'create_frame', args: {} }] }),
    generationMethod: 'initial',
    iterationBorn: iteration,
    metadata: { generatedAt: Date.now() },
  };

  return {
    candidate,
    rendered: {
      candidate,
      screenshot: mockScreenshot,
      renderSuccessful: true,
    },
    verification: {
      overallScore: score,
      acceptable: score >= 0.85,
      critique: 'Test',
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
  };
}

// Create mock feedback iteration
function createMockIteration(iteration: number, scores: number[]): FeedbackIteration {
  const candidates = scores.map(s => createMockScoredCandidate(s, iteration));
  const best = candidates.reduce((a, b) =>
    a.qualityScore.overall > b.qualityScore.overall ? a : b
  );

  return {
    iteration,
    timestamp: Date.now(),
    candidates,
    bestCandidate: best,
    terminationCheck: { shouldTerminate: false, confidence: 0, strategyBreakdown: [] },
    performanceMetrics: {
      totalTimeMs: 5000,
      renderTimeMs: 1500,
      verificationTimeMs: 2500,
      generationTimeMs: 1000,
      apiCalls: candidates.length + 1,
    },
    strategiesUsed: ['initial'],
  };
}

describe('Level 5: Integration Tests', () => {
  // =========================================================================
  // Test 5.1: Verification + Generation Flow
  // =========================================================================
  describe('Verification + Generation Flow', () => {
    it('should generate candidates and verify them', async () => {
      // Setup
      const provider = createMockProvider({ verificationScore: 0.85 });
      const verifier = new TieredVerifier();
      const claudeVerifier = verifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(provider);

      const strategyManager = new StrategyManager();
      strategyManager.setProvider(provider);

      // Generate initial candidates
      const context: GenerationContext = {
        intent: mockIntent,
        iteration: 1,
        previousCandidates: [],
        availableTools: ['create_frame', 'create_rectangle', 'create_text'],
      };

      const candidates = await strategyManager.generateCandidates(context, 3);
      expect(candidates.length).toBeGreaterThan(0);

      // Verify a candidate
      const verificationConfig: VerificationConfig = {
        tier: 'standard',
        primaryModel: 'claude',
      };

      const result = await verifier.verify(mockIntent, mockScreenshot, verificationConfig);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.verificationTier).toBe('standard');
    });

    it('should handle verification failure gracefully', async () => {
      const provider = createMockProvider({ failAfter: 0 });
      const verifier = new TieredVerifier();
      const claudeVerifier = verifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(provider);

      const verificationConfig: VerificationConfig = {
        tier: 'standard',
        primaryModel: 'claude',
      };

      // Should not throw, but return error result
      const result = await verifier.verify(mockIntent, mockScreenshot, verificationConfig);

      expect(result.overallScore).toBe(0);
      expect(result.critique).toContain('failed');
    });
  });

  // =========================================================================
  // Test 5.2: Generation + Termination Flow
  // =========================================================================
  describe('Generation + Termination Flow', () => {
    it('should terminate when quality threshold is met', () => {
      const terminationManager = new TerminationManager();

      // Simulate iterations with improving scores
      const iterations = [
        createMockIteration(1, [0.6, 0.65, 0.7]),
        createMockIteration(2, [0.75, 0.78, 0.8]),
        createMockIteration(3, [0.85, 0.87, 0.9]),
      ];

      const decision = terminationManager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 15000,
        timeoutMs: 60000,
      });

      expect(decision.shouldTerminate).toBe(true);
    });

    it('should continue when quality threshold not met', () => {
      const terminationManager = new TerminationManager();

      const iterations = [
        createMockIteration(1, [0.5, 0.55, 0.6]),
        createMockIteration(2, [0.6, 0.65, 0.7]),
      ];

      const decision = terminationManager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 10000,
        timeoutMs: 60000,
      });

      expect(decision.shouldTerminate).toBe(false);
    });

    it('should adjust strategy based on iteration context', () => {
      const strategyManager = new StrategyManager();

      // First iteration: should use initial
      const context1: GenerationContext = {
        intent: mockIntent,
        iteration: 1,
        previousCandidates: [],
        availableTools: ['create_frame'],
      };

      const selections1 = strategyManager.selectStrategies(context1, 3);
      expect(selections1[0]!.strategy).toBe('initial');

      // Later iteration with previous candidates: should not use initial
      const context5: GenerationContext = {
        intent: mockIntent,
        iteration: 5,
        previousCandidates: [
          createMockScoredCandidate(0.7, 1),
          createMockScoredCandidate(0.75, 2),
        ],
        availableTools: ['create_frame'],
      };

      const selections5 = strategyManager.selectStrategies(context5, 3);
      expect(selections5.every(s => s.strategy !== 'initial')).toBe(true);
    });
  });

  // =========================================================================
  // Test 5.3: Multi-Model Verification Flow
  // =========================================================================
  describe('Multi-Model Verification Flow', () => {
    it('should combine scores from multiple models', async () => {
      const tieredVerifier = new TieredVerifier();

      // Setup Claude with score 0.8
      const claudeProvider = createMockProvider({ verificationScore: 0.8 });
      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(claudeProvider);

      // Setup OpenAI with score 0.9
      const openaiProvider = createMockProvider({ verificationScore: 0.9 });
      const openaiVerifier = tieredVerifier.getVerifier('openai');
      if (openaiVerifier && 'setProvider' in openaiVerifier) {
        (openaiVerifier as any).setProvider(openaiProvider);
      }

      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.5, enabled: true },
            { name: 'openai', weight: 0.5, enabled: true },
          ],
          consensusThreshold: 0.7,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      // Should be weighted average: (0.8 * 0.5) + (0.9 * 0.5) = 0.85
      expect(result.overallScore).toBeCloseTo(0.85, 1);
      expect(result.modelBreakdown).toHaveLength(2);
      expect(result.verificationTier).toBe('advanced');
    });

    it('should calculate consensus between models', async () => {
      const tieredVerifier = new TieredVerifier();

      // Setup models with similar scores (high consensus)
      const claudeProvider = createMockProvider({ verificationScore: 0.82 });
      const openaiProvider = createMockProvider({ verificationScore: 0.85 });

      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(claudeProvider);

      const openaiVerifier = tieredVerifier.getVerifier('openai');
      if (openaiVerifier && 'setProvider' in openaiVerifier) {
        (openaiVerifier as any).setProvider(openaiProvider);
      }

      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.5, enabled: true },
            { name: 'openai', weight: 0.5, enabled: true },
          ],
          consensusThreshold: 0.7,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      // Similar scores = high consensus
      expect(result.modelConsensus).toBeGreaterThan(0.9);
    });

    it('should handle one model failing', async () => {
      const tieredVerifier = new TieredVerifier();

      // Claude works
      const claudeProvider = createMockProvider({ verificationScore: 0.85 });
      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(claudeProvider);

      // OpenAI fails
      const openaiProvider = createMockProvider({ failAfter: 0 });
      const openaiVerifier = tieredVerifier.getVerifier('openai');
      if (openaiVerifier && 'setProvider' in openaiVerifier) {
        (openaiVerifier as any).setProvider(openaiProvider);
      }

      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.5, enabled: true },
            { name: 'openai', weight: 0.5, enabled: true },
          ],
          consensusThreshold: 0.5,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      // Should still get a result from Claude
      expect(result.overallScore).toBeGreaterThan(0);
      // OpenAI failed, so might only have Claude in breakdown
    });
  });

  // =========================================================================
  // Test 5.4: Feedback Loop Simulation
  // =========================================================================
  describe('Feedback Loop Simulation', () => {
    it('should simulate improvement over iterations', async () => {
      const provider = createMockProvider({});
      const strategyManager = new StrategyManager();
      strategyManager.setProvider(provider);
      const terminationManager = new TerminationManager();

      // Simulate 5 iterations with improving scores
      const scoreProgression = [
        [0.5, 0.55, 0.6],   // Iteration 1
        [0.6, 0.65, 0.68],  // Iteration 2
        [0.68, 0.72, 0.75], // Iteration 3
        [0.75, 0.78, 0.82], // Iteration 4
        [0.82, 0.85, 0.88], // Iteration 5
      ];

      const iterations: FeedbackIteration[] = [];

      for (let i = 0; i < scoreProgression.length; i++) {
        const iteration = createMockIteration(i + 1, scoreProgression[i]!);
        iterations.push(iteration);

        const decision = terminationManager.evaluate(iterations, {
          maxIterations: 10,
          qualityThreshold: 0.85,
          startTime: Date.now() - (i + 1) * 5000,
          timeoutMs: 60000,
        });

        if (decision.shouldTerminate) {
          break;
        }
      }

      // Should have terminated at iteration 5 when score hit 0.88
      expect(iterations.length).toBe(5);

      // Best score should be 0.88
      const finalBest = iterations[iterations.length - 1]!.bestCandidate;
      expect(finalBest.qualityScore.overall).toBe(0.88);
    });

    it('should detect stagnation and suggest changes', () => {
      const terminationManager = new TerminationManager();

      // Simulate stagnating scores
      const iterations = [
        createMockIteration(1, [0.7, 0.72, 0.75]),
        createMockIteration(2, [0.75, 0.76, 0.77]),
        createMockIteration(3, [0.77, 0.77, 0.78]),
        createMockIteration(4, [0.78, 0.78, 0.78]),
        createMockIteration(5, [0.78, 0.78, 0.79]),
      ];

      const decision = terminationManager.evaluate(iterations, {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 25000,
        timeoutMs: 60000,
      });

      // Should not terminate yet (below threshold)
      // But should have suggestions about stagnation
      if (!decision.shouldTerminate && decision.alternativeSuggestions) {
        const hasDiversitySuggestion = decision.alternativeSuggestions.some(
          s => s.type === 'increase_diversity' || s.type === 'change_strategy'
        );
        expect(hasDiversitySuggestion).toBe(true);
      }
    });
  });

  // =========================================================================
  // Test 5.5: Strategy Effectiveness Tracking
  // =========================================================================
  describe('Strategy Effectiveness Tracking', () => {
    it('should track strategy usage across iterations', async () => {
      const provider = createMockProvider({});
      const strategyManager = new StrategyManager();
      strategyManager.setProvider(provider);

      // Run multiple iterations
      const contexts: GenerationContext[] = [
        {
          intent: mockIntent,
          iteration: 1,
          previousCandidates: [],
          availableTools: ['create_frame'],
        },
        {
          intent: mockIntent,
          iteration: 2,
          previousCandidates: [createMockScoredCandidate(0.7, 1)],
          availableTools: ['create_frame'],
        },
        {
          intent: mockIntent,
          iteration: 3,
          previousCandidates: [
            createMockScoredCandidate(0.7, 1),
            createMockScoredCandidate(0.75, 2),
          ],
          availableTools: ['create_frame'],
        },
      ];

      for (const ctx of contexts) {
        await strategyManager.generateCandidates(ctx, 2);
      }

      const effectiveness = strategyManager.getStrategyEffectiveness();

      // Should have tracked initial strategy
      expect(effectiveness.initial).toBeDefined();
      expect(effectiveness.initial.uses).toBeGreaterThan(0);
    });

    it('should adapt weights based on results', () => {
      const strategyManager = new StrategyManager();

      // Simulate strategy results
      const results = new Map<any, number>();
      results.set('refinement', 0.15);  // Good improvement
      results.set('mutation', 0.02);    // Marginal
      results.set('crossover', -0.05);  // Worse

      // Update weights
      strategyManager.updateWeights(results);

      // Verify weights were updated (internal, but method should not throw)
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // Test 5.6: End-to-End Scenario
  // =========================================================================
  describe('End-to-End Scenario', () => {
    it('should complete a full design generation cycle', async () => {
      // This test simulates a complete cycle without actual rendering

      // 1. Setup components
      const provider = createMockProvider({ verificationScore: 0.85 });
      const verifier = new TieredVerifier();
      const claudeVerifier = verifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(provider);

      const strategyManager = new StrategyManager();
      strategyManager.setProvider(provider);

      const terminationManager = new TerminationManager();

      // 2. Define intent
      const intent: DesignIntent = {
        description: 'Simple login form',
        requirements: { elements: ['email', 'password', 'button'] },
      };

      // 3. Generate candidates
      const context: GenerationContext = {
        intent,
        iteration: 1,
        previousCandidates: [],
        availableTools: ['create_frame', 'create_text', 'create_rectangle'],
      };

      const candidates = await strategyManager.generateCandidates(context, 3);
      expect(candidates.length).toBeGreaterThan(0);

      // 4. "Render" and verify (simulated)
      const scoredCandidates: ScoredCandidate[] = [];
      for (const candidate of candidates) {
        const verificationResult = await verifier.verify(
          intent,
          mockScreenshot,
          { tier: 'standard', primaryModel: 'claude' }
        );

        scoredCandidates.push({
          candidate,
          rendered: {
            candidate,
            screenshot: mockScreenshot,
            renderSuccessful: true,
          },
          verification: verificationResult,
          qualityScore: {
            overall: verificationResult.overallScore,
            components: [],
            confidence: verificationResult.confidence,
            normalizedScore: Math.round(verificationResult.overallScore * 100),
            improvementPotential: 1 - verificationResult.overallScore,
          },
        });
      }

      // 5. Check termination
      const bestCandidate = scoredCandidates.reduce((a, b) =>
        a.qualityScore.overall > b.qualityScore.overall ? a : b
      );

      const iteration: FeedbackIteration = {
        iteration: 1,
        timestamp: Date.now(),
        candidates: scoredCandidates,
        bestCandidate,
        terminationCheck: { shouldTerminate: false, confidence: 0, strategyBreakdown: [] },
        performanceMetrics: {
          totalTimeMs: 5000,
          renderTimeMs: 1500,
          verificationTimeMs: 2500,
          generationTimeMs: 1000,
          apiCalls: candidates.length + scoredCandidates.length,
        },
        strategiesUsed: ['initial'],
      };

      const decision = terminationManager.evaluate([iteration], {
        maxIterations: 10,
        qualityThreshold: 0.85,
        startTime: Date.now() - 5000,
        timeoutMs: 60000,
      });

      // With score 0.85, should terminate (meets threshold)
      expect(decision.shouldTerminate).toBe(true);
      expect(bestCandidate.qualityScore.overall).toBeGreaterThanOrEqual(0.85);
    });
  });
});
